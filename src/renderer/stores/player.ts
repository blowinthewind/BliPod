import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppSettingsStore } from './appSettings'
import { logger } from '../utils/logger'
import { formatDuration, parseDuration } from '../utils/format'

export type HistoryVideo = PlayHistoryEntry

const MAX_QUEUE_SIZE = 50

// 播放配置常量
const PLAYBACK_CONFIG = {
  // 视为播放完成的进度阈值（清除位置记录）
  COMPLETION_THRESHOLD: 0.95,
  // 最大可恢复进度阈值
  MAX_RESUME_PROGRESS: 0.9,
  // 限制恢复时间不超过时长的比例
  RESUME_TIME_CAP: 0.99,
  // 最小恢复时间（秒）
  MIN_RESUME_TIME: 10,
  // 最大保存的位置记录数
  MAX_POSITION_RECORDS: 100,
  // 定期保存间隔（毫秒）
  AUTO_SAVE_INTERVAL: 30000,
  // 判断搜索时长与实际播放时长差异是否足以推断多P
  MULTI_PART_DURATION_DIFF_SECONDS: 30
} as const

const PLAY_STATS_CONFIG = {
  MIN_WATCH_SECONDS: 30,
  MIN_PROGRESS_RATIO: 0.1,
  DEDUP_WINDOW_MS: 10 * 60 * 1000,
  MAX_DELTA_SECONDS: 5,
  FLUSH_INTERVAL_SECONDS: 5
} as const

function normalizeCoverUrl(cover: string): string {
  if (!cover) return cover
  if (cover.startsWith('https://')) return cover
  if (cover.startsWith('http://')) return `https://${cover.slice('http://'.length)}`
  if (cover.startsWith('//')) return `https:${cover}`
  return cover
}

function normalizeVideo<T extends ExtractedVideo>(video: T): T {
  return {
    ...video,
    cover: normalizeCoverUrl(video.cover)
  }
}

// 视频来源类型
export type VideoSource = 'favorite' | 'playlist' | 'search' | 'uploader' | 'user-queue' | 'history'

// 带来源标记的视频
export interface QueueVideo extends ExtractedVideo {
  source: VideoSource
  isFromUserQueue: boolean
}

export const usePlayerStore = defineStore('player', () => {
  const appSettings = useAppSettingsStore()

  // ========== 基础播放状态 ==========
  const currentVideo = ref<QueueVideo | null>(null)
  const currentPlaybackDetail = ref<VideoPlaybackDetail | null>(null)
  const currentPlayTarget = ref<PlayTarget | null>(null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(80)
  const isMuted = ref(false)
  const playbackRate = ref(1)
  const isRepeat = ref(false)
  const isShuffle = ref(false)

  // ========== 实际播放队列 ==========
  // 这是当前实际用于播放的队列，由场景视频列表 + 用户队列组成
  const actualQueue = ref<QueueVideo[]>([])
  const currentIndex = ref(-1)

  // ========== 用户维护的播放队列 ==========
  const userQueue = ref<ExtractedVideo[]>([])
  const userQueueBvidSet = computed(() => new Set(userQueue.value.map((video) => video.bvid)))

  // ========== 播放历史记录 ==========
  const playHistory = ref<HistoryVideo[]>([])

  // ========== 历史导航状态 ==========
  // -1 表示不在历史导航模式，>=0 表示正在浏览历史（值为历史索引）
  const historyNavigationIndex = ref(-1)

  // ========== 计算属性 ==========
  const hasVideo = computed(() => currentVideo.value !== null)
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })
  const currentPlaybackParts = computed(() => currentPlaybackDetail.value?.parts ?? [])
  const hasMultiplePlaybackParts = computed(() => currentPlaybackParts.value.length > 1)

  // 是否有下一首（从实际播放队列中）
  const hasNext = computed(() => {
    if (actualQueue.value.length === 0) return false
    if (isShuffle.value) return actualQueue.value.length > 1
    return currentIndex.value < actualQueue.value.length - 1
  })

  // 是否有上一首（从历史记录中）
  const hasPrevious = computed(() => {
    // 如果在历史导航中，检查是否还有更早的历史
    if (historyNavigationIndex.value >= 0) {
      return findPreviousHistoryIndex(historyNavigationIndex.value + 1) !== -1
    }
    // 否则检查是否有播放历史
    return findPreviousHistoryIndex(0) !== -1
  })

  let pendingResumeTime: number | null = null
  let autoSaveInterval: number | null = null
  let sessionWatchSeconds = 0
  let sessionQualified = false
  let sessionLastProgressAt: number | null = null
  let sessionLastCountedAt: number | null = null
  let pendingWatchFlushSeconds = 0
  let lastDurationWriteByBvid: { bvid: string; duration: string } | null = null
  let readyListenerUnsubscribe: (() => void) | null = null
  let progressListenerUnsubscribe: (() => void) | null = null
  let readyListenerRefCount = 0
  let progressListenerRefCount = 0
  let playbackDetailLazyLoadState: 'idle' | 'loading' | 'done' = 'idle'
  let isHandlingPlaybackEnd = false

  function syncNativePlaybackState() {
    window.electronAPI.nativePlayer.updateState({
      hasVideo: hasVideo.value,
      hasNext: hasNext.value,
      hasPrevious: hasPrevious.value,
      title: currentVideo.value?.title || '',
      author: currentVideo.value?.author || '',
      isPlaying: isPlaying.value,
      isMuted: isMuted.value,
      volume: volume.value,
      isShuffle: isShuffle.value,
      isRepeat: isRepeat.value
    })
  }

  // ========== 辅助函数 ==========

  function findPreviousHistoryIndex(startIndex: number): number {
    let index = startIndex
    while (index < playHistory.value.length) {
      if (!currentVideo.value || playHistory.value[index]?.bvid !== currentVideo.value.bvid) {
        return index
      }
      index++
    }
    return -1
  }

  // 将普通视频转换为带标记的队列视频
  function markVideoSource(
    video: ExtractedVideo,
    source: VideoSource,
    isFromUserQueue: boolean = false
  ): QueueVideo {
    return {
      ...normalizeVideo(video),
      source,
      isFromUserQueue
    }
  }

  // 构建实际播放队列
  function buildActualQueue(
    clickedVideo: ExtractedVideo,
    contextVideos: ExtractedVideo[] = [],
    source: VideoSource = 'search'
  ): QueueVideo[] {
    const queue: QueueVideo[] = []
    const addedBvids = new Set<string>()

    // 1. 首先添加点击的视频到队首
    queue.push(markVideoSource(clickedVideo, source, false))
    addedBvids.add(clickedVideo.bvid)

    // 2. 添加上下文视频（排除已点击的）
    for (const video of contextVideos) {
      if (!addedBvids.has(video.bvid)) {
        queue.push(markVideoSource(video, source, false))
        addedBvids.add(video.bvid)
      }
    }

    // 3. 添加用户队列（排除重复的）
    for (const video of userQueue.value) {
      if (!addedBvids.has(video.bvid)) {
        queue.push(markVideoSource(video, 'user-queue', true))
        addedBvids.add(video.bvid)
      }
    }

    return queue
  }

  function createPlayTarget(cid?: number | null, partIndex?: number | null): PlayTarget | undefined {
    const normalizedCid = typeof cid === 'number' && Number.isFinite(cid) && cid > 0 ? cid : undefined
    const normalizedPartIndex =
      typeof partIndex === 'number' && Number.isFinite(partIndex) && partIndex > 0 ? partIndex : undefined

    if (normalizedCid == null && normalizedPartIndex == null) {
      return undefined
    }

    return {
      ...(normalizedCid != null ? { cid: normalizedCid } : {}),
      ...(normalizedPartIndex != null ? { partIndex: normalizedPartIndex } : {})
    }
  }

  function getHistoryEntryPlayTarget(video: ExtractedVideo | HistoryVideo): PlayTarget | undefined {
    const candidate = video as Partial<PlayHistoryEntry>
    return createPlayTarget(candidate.cid, candidate.partIndex)
  }

  function getActivePlayTarget(video: ExtractedVideo | null = currentVideo.value): PlayTarget | undefined {
    if (!video || currentVideo.value?.bvid !== video.bvid) {
      return undefined
    }

    return createPlayTarget(currentPlayTarget.value?.cid, currentPlayTarget.value?.partIndex)
  }

  function getCurrentPositionTarget(video: ExtractedVideo | null = currentVideo.value): {
    cid: number | null
    partIndex: number | null
  } {
    const activeTarget = getActivePlayTarget(video)
    if (activeTarget) {
      return {
        cid: activeTarget.cid ?? null,
        partIndex: activeTarget.partIndex ?? null
      }
    }

    const fallbackTarget =
      video && currentVideo.value?.bvid === video.bvid
        ? createPlayTarget(currentPlaybackDetail.value?.defaultCid, currentPlaybackDetail.value?.defaultPart)
        : undefined

    return {
      cid: fallbackTarget?.cid ?? null,
      partIndex: fallbackTarget?.partIndex ?? null
    }
  }

  function getPositionPlayTarget(
    position: PlayPosition | null | undefined,
    fallbackTarget?: PlayTarget
  ): PlayTarget | undefined {
    const positionTarget = createPlayTarget(position?.cid, position?.partIndex)

    if (
      positionTarget?.cid != null &&
      positionTarget.partIndex == null &&
      fallbackTarget?.cid === positionTarget.cid &&
      fallbackTarget.partIndex != null
    ) {
      return fallbackTarget
    }

    return positionTarget ?? fallbackTarget
  }

  async function repairHistoryEntries(history: HistoryVideo[]): Promise<HistoryVideo[]> {
    let hasChanges = false

    const repairedHistory = await Promise.all(
      history.map(async (entry) => {
        if (entry.cid == null || entry.partIndex != null) {
          return entry
        }

        const detail = await loadPlaybackDetail(entry.bvid)
        const matchedPart = detail?.parts.find((part) => part.cid === entry.cid)
        if (!matchedPart || matchedPart.partIndex <= 0) {
          return entry
        }

        hasChanges = true
        return {
          ...entry,
          cid: matchedPart.cid,
          partIndex: matchedPart.partIndex
        }
      })
    )

    if (!hasChanges) {
      return history
    }

    try {
      await window.electronAPI.store.clearPlayHistory()
      for (const entry of [...repairedHistory].reverse()) {
        await window.electronAPI.store.addOrUpdatePlayHistory(entry)
      }
    } catch (e) {
      logger.warn('Failed to repair play history entries:', e)
      return history
    }

    return repairedHistory
  }

  // ========== 播放控制 ==========

  async function saveCurrentPosition(
    video: ExtractedVideo | null = currentVideo.value,
    time: number = currentTime.value,
    dur: number = duration.value
  ) {
    if (video?.bvid === currentVideo.value?.bvid) {
      await flushPendingWatchTime(time, dur)
    }
    if (!video || !appSettings.rememberPosition) return
    if (time > 0 && dur > 0) {
      const { cid, partIndex } = getCurrentPositionTarget(video)

      try {
        // 如果当前时间超过视频时长的95%，视为已播放完成，清除位置记录
        if (time >= dur * PLAYBACK_CONFIG.COMPLETION_THRESHOLD) {
          await window.electronAPI.store.clearPlayPosition(video.bvid, cid, partIndex)
        } else {
          await window.electronAPI.store.savePlayPosition({
            bvid: video.bvid,
            cid,
            partIndex,
            currentTime: time,
            duration: dur,
            updatedAt: Date.now()
          })
        }
      } catch (e) {
        logger.warn('Failed to save play position:', e)
      }
    }
  }

  /**
   * 恢复视频播放位置
   * @param video 要恢复位置的视频
   */
  async function restorePlayPosition(video: ExtractedVideo, target?: PlayTarget): Promise<PlayTarget | undefined> {
    if (!appSettings.rememberPosition) return target

    try {
      const requestedTarget = createPlayTarget(target?.cid, target?.partIndex)
      const position = requestedTarget
        ? await window.electronAPI.store.getPlayPosition(
            video.bvid,
            requestedTarget.cid ?? null,
            requestedTarget.partIndex ?? null
          )
        : await window.electronAPI.store.getLastPlayPositionByBvid(video.bvid)

      if (!position || position.currentTime <= 0 || position.duration <= 0) {
        return requestedTarget
      }

      const progressPercent = position.currentTime / position.duration

      // 如果进度超过90%，视为已播放完成，不恢复
      if (progressPercent >= PLAYBACK_CONFIG.MAX_RESUME_PROGRESS) {
        return requestedTarget
      }

      // 限制恢复时间不超过99%，且至少10秒才恢复
      const resumeTime = Math.min(
        position.currentTime,
        position.duration * PLAYBACK_CONFIG.RESUME_TIME_CAP
      )
      if (resumeTime > PLAYBACK_CONFIG.MIN_RESUME_TIME) {
        pendingResumeTime = resumeTime
      }

      return getPositionPlayTarget(position, requestedTarget)
    } catch (e) {
      logger.warn('Failed to restore play position:', e)
      return target
    }
  }

  async function loadPlaybackDetail(bvid: string): Promise<VideoPlaybackDetail | null> {
    try {
      return await window.electronAPI.search.getPlaybackDetail(bvid)
    } catch (e) {
      logger.warn('Failed to load playback detail:', e)
      return null
    }
  }

  function isLikelyMultiPartVideo(video: ExtractedVideo | null, actualDuration: number): boolean {
    if (!video || actualDuration <= 0) return false

    const extractedDuration = parseDuration(video.duration)
    if (extractedDuration <= 0) return false

    return (
      extractedDuration - actualDuration >= PLAYBACK_CONFIG.MULTI_PART_DURATION_DIFF_SECONDS
    )
  }

  async function ensurePlaybackDetailForCurrentVideo(): Promise<void> {
    const video = currentVideo.value
    if (!video || playbackDetailLazyLoadState !== 'idle') return

    playbackDetailLazyLoadState = 'loading'
    const detail = await loadPlaybackDetail(video.bvid)

    if (!currentVideo.value || currentVideo.value.bvid !== video.bvid) {
      return
    }

    const previousTarget = currentPlayTarget.value ?? undefined
    currentPlaybackDetail.value = detail
    const target = resolvePlayTarget(detail, previousTarget)
    currentPlayTarget.value = target ?? currentPlayTarget.value

    if (
      target &&
      ((previousTarget?.cid ?? null) !== (target.cid ?? null) ||
        (previousTarget?.partIndex ?? null) !== (target.partIndex ?? null))
    ) {
      void addToHistory(video, target)
    }

    playbackDetailLazyLoadState = 'done'
  }

  function resolvePlayTarget(
    detail: VideoPlaybackDetail | null,
    requestedTarget?: PlayTarget
  ): PlayTarget | undefined {
    const normalizedTarget = createPlayTarget(requestedTarget?.cid, requestedTarget?.partIndex)
    if (normalizedTarget && detail?.parts?.length) {
      const matchedPart =
        (normalizedTarget.cid != null
          ? detail.parts.find((part) => part.cid === normalizedTarget.cid)
          : undefined) ??
        (normalizedTarget.partIndex != null
          ? detail.parts.find((part) => part.partIndex === normalizedTarget.partIndex)
          : undefined)

      if (matchedPart) {
        return {
          cid: matchedPart.cid,
          partIndex: matchedPart.partIndex
        }
      }
    }

    if (normalizedTarget) {
      return normalizedTarget
    }

    if (detail?.defaultCid != null) {
      return {
        cid: detail.defaultCid,
        partIndex: detail.defaultPart
      }
    }

    return undefined
  }

  async function startPlayback(
    video: ExtractedVideo,
    autoplay: boolean = true,
    requestedTarget?: PlayTarget
  ): Promise<void> {
    currentPlaybackDetail.value = null
    currentPlayTarget.value = requestedTarget ?? null
    playbackDetailLazyLoadState = 'idle'

    window.electronAPI.search.playVideo(video.bvid, autoplay, requestedTarget)
  }

  async function playCurrentVideoPart(part: VideoPartInfo): Promise<void> {
    const video = currentVideo.value
    if (!video) return

    if (
      currentPlayTarget.value?.cid === part.cid &&
      currentPlayTarget.value?.partIndex === part.partIndex
    ) {
      return
    }

    await saveCurrentPosition(video)

    pendingResumeTime = null
    currentTime.value = 0
    duration.value = 0
    isLoading.value = true
    isPlaying.value = false
    currentPlayTarget.value = {
      cid: part.cid,
      partIndex: part.partIndex
    }

    await addToHistory(video, {
      cid: part.cid,
      partIndex: part.partIndex
    })

    window.electronAPI.search.playVideo(video.bvid, true, {
      cid: part.cid,
      partIndex: part.partIndex
    })
    syncNativePlaybackState()
  }

  function getCurrentPlaybackPartIndex(): number {
    const detail = currentPlaybackDetail.value
    if (!detail || currentPlaybackParts.value.length === 0) {
      return -1
    }

    if (currentPlayTarget.value?.cid != null) {
      const matchedByCid = currentPlaybackParts.value.findIndex((part) => part.cid === currentPlayTarget.value?.cid)
      if (matchedByCid !== -1) {
        return matchedByCid
      }
    }

    if (currentPlayTarget.value?.partIndex != null) {
      const matchedByPartIndex = currentPlaybackParts.value.findIndex(
        (part) => part.partIndex === currentPlayTarget.value?.partIndex
      )
      if (matchedByPartIndex !== -1) {
        return matchedByPartIndex
      }
    }

    return currentPlaybackParts.value.findIndex((part) => part.partIndex === detail.defaultPart)
  }

  function getNextPlaybackPart(): VideoPartInfo | null {
    const currentPartIndex = getCurrentPlaybackPartIndex()
    if (currentPartIndex < 0) {
      return null
    }

    return currentPlaybackParts.value[currentPartIndex + 1] ?? null
  }

  async function tryAutoPlayNextPlaybackPart(): Promise<boolean> {
    if (!appSettings.autoPlayNextPart) {
      return false
    }

    if (!currentPlaybackDetail.value || currentPlaybackParts.value.length <= 1) {
      return false
    }

    const nextPart = getNextPlaybackPart()
    if (!nextPart) {
      return false
    }

    await playCurrentVideoPart(nextPart)
    return true
  }

  async function handlePlaybackEnded(): Promise<void> {
    if (isHandlingPlaybackEnd) {
      return
    }

    isHandlingPlaybackEnd = true

    if (isRepeat.value) {
      seek(0)
      play()
      return
    }

    const switchedToNextPart = await tryAutoPlayNextPlaybackPart()
    if (switchedToNextPart) {
      return
    }

    await handleVideoComplete()
  }

  /**
   * 启动定期自动保存
   */
  function startAutoSave() {
    if (autoSaveInterval) return
    autoSaveInterval = window.setInterval(() => {
      if (isPlaying.value && currentVideo.value) {
        saveCurrentPosition()
      }
    }, PLAYBACK_CONFIG.AUTO_SAVE_INTERVAL)
  }

  function resetPlaySession() {
    sessionWatchSeconds = 0
    sessionQualified = false
    sessionLastProgressAt = null
    sessionLastCountedAt = null
    pendingWatchFlushSeconds = 0
  }

  function clearDurationWriteCache(bvid?: string) {
    if (!bvid || lastDurationWriteByBvid?.bvid === bvid) {
      lastDurationWriteByBvid = null
    }
  }

  async function flushPendingWatchTime(position: number = currentTime.value, dur: number = duration.value) {
    if (!currentVideo.value || pendingWatchFlushSeconds <= 0) return

    const flushSeconds = pendingWatchFlushSeconds
    pendingWatchFlushSeconds = 0

    try {
      await window.electronAPI.store.updateWatchTime(
        currentVideo.value.bvid,
        flushSeconds,
        dur,
        position
      )
    } catch (e) {
      pendingWatchFlushSeconds += flushSeconds
      logger.warn('Failed to flush watch time:', e)
    }
  }

  async function loadPlaySessionStats(bvid: string) {
    try {
      const stats = await window.electronAPI.store.getPlayStats(bvid)
      if (stats && typeof stats === 'object' && 'lastCountedAt' in stats) {
        sessionLastCountedAt = (stats as { lastCountedAt: number | null }).lastCountedAt
      } else {
        sessionLastCountedAt = null
      }
    } catch (e) {
      sessionLastCountedAt = null
      logger.warn('Failed to load play stats:', e)
    }
  }

  /**
   * 停止定期自动保存
   */
  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
    }
  }

  /**
   * 恢复最后播放的视频（从 playHistory 中获取）
   * 根据 autoPlay 设置决定是否自动播放
   * 根据 rememberPosition 设置决定是否恢复播放位置
   * @returns 是否成功恢复
   */
  async function restoreLastPlayedVideo(): Promise<boolean> {
    try {
      if (playHistory.value.length === 0) {
        await loadHistory()
      }

      const lastPlayed = playHistory.value[0]
      if (!lastPlayed) return false

      const requestedTarget = getHistoryEntryPlayTarget(lastPlayed)
      const restoredTarget = await restorePlayPosition(lastPlayed, requestedTarget)

      actualQueue.value = buildActualQueue(lastPlayed, [], 'history')
      currentIndex.value = 0
      historyNavigationIndex.value = -1

      currentVideo.value = actualQueue.value[0]
      isLoading.value = true
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      currentPlaybackDetail.value = null
      currentPlayTarget.value = restoredTarget ?? requestedTarget ?? null
      playbackDetailLazyLoadState = 'idle'
      resetPlaySession()
      await loadPlaySessionStats(lastPlayed.bvid)

      const shouldAutoPlay = appSettings.autoPlay
      await startPlayback(lastPlayed, shouldAutoPlay, restoredTarget ?? requestedTarget)
      if (shouldAutoPlay) {
        isPlaying.value = true
      }

      syncNativePlaybackState()
      return true
    } catch (e) {
      logger.warn('Failed to restore last played video:', e)
      return false
    }
  }

  /**
   * 播放视频
   * @param video 要播放的视频
   * @param contextVideos 上下文视频列表（如收藏列表、UP主视频列表等）
   * @param source 视频来源
   */
  async function playVideo(
    video: ExtractedVideo,
    contextVideos?: ExtractedVideo[],
    source: VideoSource = 'search'
  ) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    // 只有在切换不同视频时才保存上一个视频的位置
    if (previousVideo && previousVideo.bvid !== video.bvid && previousTime > 0) {
      await flushPendingWatchTime(previousTime, previousDuration)
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
      clearDurationWriteCache(previousVideo.bvid)
    }

    // 构建实际播放队列
    actualQueue.value = buildActualQueue(video, contextVideos, source)
    currentIndex.value = 0

    // 重置历史导航状态
    historyNavigationIndex.value = -1

    // 设置当前视频
    currentVideo.value = actualQueue.value[0]
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    currentPlaybackDetail.value = null
    currentPlayTarget.value = null
    playbackDetailLazyLoadState = 'idle'
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    const requestedTarget = getHistoryEntryPlayTarget(video)

    // 恢复播放位置
    const restoredTarget = await restorePlayPosition(video, requestedTarget)
    currentPlayTarget.value = restoredTarget ?? requestedTarget ?? null

    // 添加到播放历史记录
    await addToHistory(video, restoredTarget ?? requestedTarget)

    syncNativePlaybackState()
    await startPlayback(video, true, restoredTarget ?? requestedTarget)
  }

  function play() {
    if (!isPlaying.value) {
      window.electronAPI.search.resumeVideo()
      isPlaying.value = true
      startAutoSave()
      syncNativePlaybackState()
    }
  }

  async function pause() {
    if (isPlaying.value) {
      window.electronAPI.search.pauseVideo()
      isPlaying.value = false
      syncNativePlaybackState()
      await flushPendingWatchTime()
      await saveCurrentPosition()
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  async function stop() {
    isHandlingPlaybackEnd = false
    stopAutoSave()
    await flushPendingWatchTime()
    await saveCurrentPosition()
    clearDurationWriteCache(currentVideo.value?.bvid)
    window.electronAPI.search.pauseVideo()
    currentVideo.value = null
    currentPlaybackDetail.value = null
    currentPlayTarget.value = null
    playbackDetailLazyLoadState = 'idle'
    isPlaying.value = false
    isLoading.value = false
    currentTime.value = 0
    duration.value = 0
    actualQueue.value = []
    currentIndex.value = -1
    historyNavigationIndex.value = -1
    resetPlaySession()
    syncNativePlaybackState()
  }

  function seek(time: number) {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
    window.electronAPI.search.seekVideo(currentTime.value)
  }

  function seekByPercent(percent: number) {
    seek((percent / 100) * duration.value)
  }

  function seekForward(seconds: number = 30) {
    seek(currentTime.value + seconds)
  }

  function seekBackward(seconds: number = 15) {
    seek(currentTime.value - seconds)
  }

  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(100, value))
    window.electronAPI.search.setVolume(volume.value)
    if (volume.value > 0) {
      isMuted.value = false
    }
    appSettings.setLastVolume(volume.value)
    syncNativePlaybackState()
  }

  function initVolume() {
    volume.value = appSettings.lastVolume
    window.electronAPI.search.setVolume(volume.value)
    syncNativePlaybackState()
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    window.electronAPI.search.setVolume(isMuted.value ? 0 : volume.value)
    syncNativePlaybackState()
  }

  function setPlaybackRate(rate: number) {
    playbackRate.value = Math.max(0.25, Math.min(2, rate))
  }

  // ========== 下一首/上一首 ==========

  function next() {
    // 如果正在历史导航模式，退出该模式并从实际队列继续
    if (historyNavigationIndex.value >= 0) {
      historyNavigationIndex.value = -1
    }

    if (!hasNext.value) {
      // 没有下一首，停止播放
      stop()
      return
    }

    let nextVideo: QueueVideo

    if (isShuffle.value) {
      // 随机播放：从实际队列中随机选择一个（排除当前）
      const availableIndices = actualQueue.value
        .map((_, i) => i)
        .filter((i) => i !== currentIndex.value)
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
      currentIndex.value = randomIndex
      nextVideo = actualQueue.value[randomIndex]
    } else {
      // 顺序播放
      currentIndex.value++
      nextVideo = actualQueue.value[currentIndex.value]
    }

    playVideoFromQueue(nextVideo)
  }

  function previous() {
    if (!hasPrevious.value) return

    // 从历史记录中获取上一首
    if (historyNavigationIndex.value < 0) {
      // 第一次点击上一首，从历史第一条开始
      historyNavigationIndex.value = 0
    } else {
      // 继续向前浏览历史
      historyNavigationIndex.value++
    }

    historyNavigationIndex.value = findPreviousHistoryIndex(historyNavigationIndex.value)
    if (historyNavigationIndex.value === -1) {
      logger.info('No earlier history to play')
      return
    }

    const historyVideo = playHistory.value[historyNavigationIndex.value]
    if (historyVideo) {
      // 从历史播放时，不传入 contextVideos，保持当前实际队列不变
      playVideoFromHistory(historyVideo)
    }
  }

  // 从实际播放队列中播放（用于 next）
  async function playVideoFromQueue(video: QueueVideo) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    // 保存上一个视频的位置
    if (previousVideo && previousVideo.bvid !== video.bvid && previousTime > 0) {
      await flushPendingWatchTime(previousTime, previousDuration)
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
      clearDurationWriteCache(previousVideo.bvid)
    }

    currentVideo.value = video
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    currentPlaybackDetail.value = null
    currentPlayTarget.value = null
    playbackDetailLazyLoadState = 'idle'
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    const requestedTarget = getHistoryEntryPlayTarget(video)

    // 恢复播放位置
    const restoredTarget = await restorePlayPosition(video, requestedTarget)
    currentPlayTarget.value = restoredTarget ?? requestedTarget ?? null

    // 添加到播放历史
    await addToHistory(video, restoredTarget ?? requestedTarget)

    syncNativePlaybackState()
    await startPlayback(video, true, restoredTarget ?? requestedTarget)
  }

  // 从历史记录中播放（用于 previous）
  async function playVideoFromHistory(video: HistoryVideo) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    // 保存上一个视频的位置
    if (previousVideo && previousVideo.bvid !== video.bvid && previousTime > 0) {
      await flushPendingWatchTime(previousTime, previousDuration)
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
      clearDurationWriteCache(previousVideo.bvid)
    }

    // 转换为队列视频
    const queueVideo: QueueVideo = {
      ...video,
      source: 'history',
      isFromUserQueue: userQueueBvidSet.value.has(video.bvid)
    }

    currentVideo.value = queueVideo
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    currentPlaybackDetail.value = null
    currentPlayTarget.value = null
    playbackDetailLazyLoadState = 'idle'
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    const requestedTarget = getHistoryEntryPlayTarget(video)

    // 恢复播放位置
    const restoredTarget = await restorePlayPosition(video, requestedTarget)
    currentPlayTarget.value = restoredTarget ?? requestedTarget ?? null

    // 注意：从历史播放时，不添加到历史，避免重复
    syncNativePlaybackState()
    await startPlayback(video, true, restoredTarget ?? requestedTarget)
  }

  function toggleRepeat() {
    const nextRepeat = !isRepeat.value
    isRepeat.value = nextRepeat
    if (nextRepeat) {
      isShuffle.value = false
    }
    syncNativePlaybackState()
  }

  function toggleShuffle() {
    const nextShuffle = !isShuffle.value
    isShuffle.value = nextShuffle
    if (nextShuffle) {
      isRepeat.value = false
    }
    syncNativePlaybackState()
  }

  // ========== 播放历史记录 ==========

  async function addToHistory(video: ExtractedVideo, target?: PlayTarget) {
    const resolvedTarget = createPlayTarget(target?.cid, target?.partIndex) ?? getHistoryEntryPlayTarget(video)

    const entry: HistoryVideo = {
      ...normalizeVideo(video),
      playedAt: Date.now(),
      cid: resolvedTarget?.cid ?? null,
      partIndex: resolvedTarget?.partIndex ?? null
    }

    try {
      await window.electronAPI.store.addOrUpdatePlayHistory(entry)
      playHistory.value = await window.electronAPI.store.getPlayHistory()
    } catch (e) {
      logger.warn('Failed to update play history:', e)
    }
  }

  async function removeFromHistory(bvid: string) {
    try {
      await window.electronAPI.store.removeFromPlayHistory(bvid)
      playHistory.value = await window.electronAPI.store.getPlayHistory()
      syncNativePlaybackState()
    } catch (e) {
      logger.warn('Failed to remove play history item:', e)
    }
  }

  async function clearHistory() {
    try {
      await window.electronAPI.store.clearPlayHistory()
      playHistory.value = []
      syncNativePlaybackState()
    } catch (e) {
      logger.warn('Failed to clear play history:', e)
    }
  }

  async function loadHistory() {
    try {
      const history = await window.electronAPI.store.getPlayHistory()
      playHistory.value = await repairHistoryEntries(history)
    } catch (e) {
      logger.warn('Failed to load play history:', e)
      playHistory.value = []
    }
    syncNativePlaybackState()
  }

  function updateVideoDuration(bvid: string, durationSeconds: number) {
    const formattedDuration = formatDuration(durationSeconds)
    if (!formattedDuration) return

    const historyIndex = playHistory.value.findIndex((v) => v.bvid === bvid)
    const historyDuration = historyIndex !== -1 ? playHistory.value[historyIndex].duration : ''
    const hasHistoryDuration = Boolean(historyDuration)
    const hasDurationChanged = historyDuration !== formattedDuration
    const hasWrittenSameDuration =
      lastDurationWriteByBvid?.bvid === bvid && lastDurationWriteByBvid.duration === formattedDuration

    if (hasHistoryDuration && !hasDurationChanged && hasWrittenSameDuration) {
      return
    }

    if (historyIndex !== -1 && hasDurationChanged) {
      const currentEntry = playHistory.value[historyIndex]
      const activeTarget = getActivePlayTarget(currentVideo.value?.bvid === bvid ? currentVideo.value : null)
      const nextEntry: HistoryVideo = {
        ...currentEntry,
        duration: formattedDuration,
        cid: activeTarget?.cid ?? currentEntry.cid,
        partIndex: activeTarget?.partIndex ?? currentEntry.partIndex
      }
      playHistory.value[historyIndex] = nextEntry
      void window.electronAPI.store.addOrUpdatePlayHistory(nextEntry)
    }

    lastDurationWriteByBvid = {
      bvid,
      duration: formattedDuration
    }

    void window.electronAPI.store.updateFavoriteDuration(bvid, formattedDuration)
    void window.electronAPI.store.updatePlaylistVideoDuration(bvid, formattedDuration)
  }

  // ========== 用户维护的播放队列 ==========

  async function addToUserQueue(video: ExtractedVideo) {
    if (userQueueBvidSet.value.has(video.bvid)) {
      return false
    }
    if (userQueue.value.length >= MAX_QUEUE_SIZE) {
      return false
    }
    userQueue.value.push(video)

    // 持久化到存储 - 转换为普通对象避免 IPC 克隆错误
    try {
      const plainVideo = JSON.parse(JSON.stringify(video))
      await window.electronAPI.store.addToUserQueue(plainVideo)
    } catch (e) {
      logger.warn('Failed to save user queue:', e)
    }

    // 同步更新实际播放队列（如果当前不在历史导航模式）
    if (historyNavigationIndex.value < 0 && currentVideo.value) {
      const exists = actualQueue.value.some((v) => v.bvid === video.bvid)
      if (!exists) {
        actualQueue.value.push(markVideoSource(video, 'user-queue', true))
      }
    }

    syncNativePlaybackState()
    return true
  }

  async function removeFromUserQueue(bvid: string) {
    const index = userQueue.value.findIndex((v) => v.bvid === bvid)
    if (index > -1) {
      userQueue.value.splice(index, 1)

      // 持久化到存储
      try {
        await window.electronAPI.store.removeFromUserQueue(bvid)
      } catch (e) {
        logger.warn('Failed to save user queue:', e)
      }

      // 同步更新实际播放队列
      const actualIndex = actualQueue.value.findIndex((v) => v.bvid === bvid && v.isFromUserQueue)
      if (actualIndex > -1) {
        actualQueue.value.splice(actualIndex, 1)
        // 如果删除的是当前播放之前的视频，调整索引
        if (currentIndex.value > actualIndex) {
          currentIndex.value--
        }
      }

      syncNativePlaybackState()
    }
  }

  async function clearUserQueue() {
    userQueue.value = []

    // 持久化到存储
    try {
      await window.electronAPI.store.clearUserQueue()
    } catch (e) {
      logger.warn('Failed to save user queue:', e)
    }

    // 同步更新实际播放队列，移除所有来自用户队列的视频
    actualQueue.value = actualQueue.value.filter((v) => !v.isFromUserQueue)

    // 重新计算当前索引
    if (currentVideo.value) {
      const newIndex = actualQueue.value.findIndex((v) => v.bvid === currentVideo.value?.bvid)
      currentIndex.value = newIndex
    } else {
      currentIndex.value = -1
    }

    syncNativePlaybackState()
  }

  async function moveUserQueueItem(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= userQueue.value.length) return
    if (toIndex < 0 || toIndex >= userQueue.value.length) return
    if (fromIndex === toIndex) return

    const item = userQueue.value[fromIndex]
    userQueue.value.splice(fromIndex, 1)
    userQueue.value.splice(toIndex, 0, item)

    // 持久化到存储
    try {
      await window.electronAPI.store.moveUserQueueItem(fromIndex, toIndex)
    } catch (e) {
      logger.warn('Failed to save user queue:', e)
    }

    // 同步更新实际播放队列中的顺序
    const actualFromIndex = actualQueue.value.findIndex(
      (v) => v.bvid === item.bvid && v.isFromUserQueue
    )
    if (actualFromIndex > -1) {
      const actualToIndex = actualQueue.value.findIndex(
        (v, i) =>
          v.isFromUserQueue &&
          i > (fromIndex < toIndex ? actualFromIndex : -1) &&
          userQueue.value[toIndex - (fromIndex < toIndex ? 1 : 0)]?.bvid === v.bvid
      )

      if (actualToIndex > -1) {
        const queueItem = actualQueue.value[actualFromIndex]
        actualQueue.value.splice(actualFromIndex, 1)
        actualQueue.value.splice(actualToIndex, 0, queueItem)

        // 调整 currentIndex
        if (currentIndex.value === actualFromIndex) {
          currentIndex.value = actualToIndex
        } else if (actualFromIndex < currentIndex.value && actualToIndex >= currentIndex.value) {
          currentIndex.value--
        } else if (actualFromIndex > currentIndex.value && actualToIndex <= currentIndex.value) {
          currentIndex.value++
        }
      }
    }

    syncNativePlaybackState()
  }

  // 加载用户队列
  async function loadUserQueue() {
    try {
      userQueue.value = await window.electronAPI.store.getUserQueue()
    } catch (e) {
      logger.warn('Failed to load user queue', e instanceof Error ? e.message : String(e))
      userQueue.value = []
    }

    syncNativePlaybackState()
  }

  // 从用户队列播放指定视频
  function playFromUserQueue(index: number) {
    if (index < 0 || index >= userQueue.value.length) return

    const video = userQueue.value[index]

    // 构建新的实际播放队列：点击的视频 + 用户队列其余部分
    const queue: QueueVideo[] = []
    const addedBvids = new Set<string>()

    // 1. 添加点击的视频到队首
    queue.push(markVideoSource(video, 'user-queue', true))
    addedBvids.add(video.bvid)

    // 2. 添加用户队列的其余视频
    for (const v of userQueue.value) {
      if (!addedBvids.has(v.bvid)) {
        queue.push(markVideoSource(v, 'user-queue', true))
        addedBvids.add(v.bvid)
      }
    }

    actualQueue.value = queue
    currentIndex.value = 0
    historyNavigationIndex.value = -1
    syncNativePlaybackState()

    playVideoFromQueue(queue[0])
  }

  // 整个视频播放完成后的处理
  async function handleVideoComplete() {
    const completedVideo = currentVideo.value
    if (!completedVideo) {
      return
    }

    await flushPendingWatchTime()

    if (currentVideo.value?.bvid !== completedVideo.bvid) {
      return
    }

    const index = userQueue.value.findIndex((v) => v.bvid === completedVideo.bvid)
    if (index > -1) {
      userQueue.value.splice(index, 1)
      try {
        await window.electronAPI.store.removeFromUserQueue(completedVideo.bvid)
      } catch (e) {
        logger.warn('Failed to save user queue:', e)
      }

      syncNativePlaybackState()
    }

    // 清除播放位置记录（只清当前分P）
    if (appSettings.rememberPosition) {
      const { cid, partIndex } = getCurrentPositionTarget(completedVideo)
      void window.electronAPI.store.clearPlayPosition(completedVideo.bvid, cid, partIndex)
    }

    clearDurationWriteCache(completedVideo.bvid)

    if (currentVideo.value?.bvid !== completedVideo.bvid) {
      return
    }

    // 自动播放下一首
    next()
  }

  // ========== 事件监听 ==========

  function setReadyListener() {
    if (!readyListenerUnsubscribe) {
      readyListenerUnsubscribe = window.electronAPI.search.onPlayerReady(() => {
        isHandlingPlaybackEnd = false
        isLoading.value = false
        isPlaying.value = true
        window.electronAPI.search.setVolume(volume.value)
        syncNativePlaybackState()

        // 恢复播放位置
        if (pendingResumeTime !== null) {
          const targetTime = pendingResumeTime
          pendingResumeTime = null

          // 使用 requestAnimationFrame 确保 DOM 已更新
          requestAnimationFrame(() => {
            window.electronAPI.search.seekVideo(targetTime)
            logger.info(`Resumed playback at ${targetTime}s`)
          })
        }
      })
    }

    readyListenerRefCount += 1

    return () => {
      readyListenerRefCount = Math.max(0, readyListenerRefCount - 1)
      if (readyListenerRefCount === 0 && readyListenerUnsubscribe) {
        readyListenerUnsubscribe()
        readyListenerUnsubscribe = null
      }
    }
  }

  function setProgressListener() {
    if (!progressListenerUnsubscribe) {
      progressListenerUnsubscribe = window.electronAPI.search.onPlayerProgress((progress: PlayerProgress) => {
        // 如果没有当前视频，不更新进度（避免stop()后进度被重新设置）
        if (!currentVideo.value) return

        const currentBvid = currentVideo.value.bvid
        const wasPlaying = isPlaying.value

        currentTime.value = progress.currentTime
        duration.value = progress.duration || 0
        isPlaying.value = !progress.paused

        if (
          progress.duration <= 0 ||
          progress.currentTime < progress.duration * 0.99 ||
          !progress.paused
        ) {
          isHandlingPlaybackEnd = false
        }

        if (wasPlaying !== isPlaying.value) {
          syncNativePlaybackState()
        }

        if (progress.duration > 0) {
          if (
            !currentPlaybackDetail.value &&
            isLikelyMultiPartVideo(currentVideo.value, progress.duration)
          ) {
            void ensurePlaybackDetailForCurrentVideo()
          }

          updateVideoDuration(currentBvid, progress.duration)
        }

        const now = Date.now()
        let activePlayback = false
        if (sessionLastProgressAt === null) {
          sessionLastProgressAt = now
        } else {
          const deltaSeconds = Math.min(
            (now - sessionLastProgressAt) / 1000,
            PLAY_STATS_CONFIG.MAX_DELTA_SECONDS
          )
          sessionLastProgressAt = now
          if (!progress.paused && deltaSeconds > 0) {
            activePlayback = true
            sessionWatchSeconds += deltaSeconds
            pendingWatchFlushSeconds += deltaSeconds

            if (pendingWatchFlushSeconds >= PLAY_STATS_CONFIG.FLUSH_INTERVAL_SECONDS) {
              void flushPendingWatchTime(progress.currentTime, progress.duration || 0)
            }
          }
        }

        if (progress.paused && pendingWatchFlushSeconds > 0) {
          void flushPendingWatchTime(progress.currentTime, progress.duration || 0)
        }

        if (!sessionQualified && progress.duration > 0 && activePlayback) {
          const progressRatio = progress.currentTime / progress.duration
          if (
            sessionWatchSeconds >= PLAY_STATS_CONFIG.MIN_WATCH_SECONDS ||
            progressRatio >= PLAY_STATS_CONFIG.MIN_PROGRESS_RATIO
          ) {
            sessionQualified = true
            const shouldCount =
              !sessionLastCountedAt || now - sessionLastCountedAt > PLAY_STATS_CONFIG.DEDUP_WINDOW_MS
            if (shouldCount) {
              sessionLastCountedAt = now
              void window.electronAPI.store.incrementPlayCount(
                currentVideo.value.bvid,
                progress.duration || 0,
                progress.currentTime
              )
            }
          }
        }

        // 检测视频是否播放完成（播放进度超过99%且处于暂停状态）
        if (
          progress.duration > 0 &&
          progress.currentTime >= progress.duration * 0.99 &&
          progress.paused
        ) {
          void handlePlaybackEnded()
        }
      })
    }

    progressListenerRefCount += 1

    return () => {
      progressListenerRefCount = Math.max(0, progressListenerRefCount - 1)
      if (progressListenerRefCount === 0 && progressListenerUnsubscribe) {
        progressListenerUnsubscribe()
        progressListenerUnsubscribe = null
      }
    }
  }

  async function getCurrentPlayStats() {
    if (!currentVideo.value) return null
    return window.electronAPI.store.getPlayStats(currentVideo.value.bvid)
  }

  return {
    // 基础状态
    currentVideo,
    currentPlaybackDetail,
    currentPlayTarget,
    currentPlaybackParts,
    hasMultiplePlaybackParts,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isRepeat,
    isShuffle,
    hasVideo,
    progress,
    hasNext,
    hasPrevious,

    // 实际播放队列
    actualQueue,
    currentIndex,

    // 用户维护的播放队列
    userQueue,
    userQueueBvidSet,

    // 播放历史记录
    playHistory,

    // 播放控制
    saveCurrentPosition,
    playVideo,
    playCurrentVideoPart,
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekByPercent,
    seekForward,
    seekBackward,
    setVolume,
    toggleMute,
    setPlaybackRate,
    next,
    previous,
    toggleRepeat,
    toggleShuffle,

    // 播放历史
    addToHistory,
    removeFromHistory,
    clearHistory,
    loadHistory,

    // 播放统计
    getCurrentPlayStats,

    // 用户队列
    addToUserQueue,
    removeFromUserQueue,
    clearUserQueue,
    moveUserQueueItem,
    playFromUserQueue,
    loadUserQueue,

    // 事件监听
    setReadyListener,
    setProgressListener,

    // 最后播放视频恢复
    restoreLastPlayedVideo,

    // 初始化
    initVolume,
    syncNativePlaybackState
  }
})
