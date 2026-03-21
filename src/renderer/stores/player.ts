import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppSettingsStore } from './appSettings'
import { logger } from '../utils/logger'
import { formatDuration } from '../utils/format'

export interface HistoryVideo extends ExtractedVideo {
  playedAt: number
}

const MAX_HISTORY_SIZE = 100
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
  AUTO_SAVE_INTERVAL: 30000
} as const

const PLAY_STATS_CONFIG = {
  MIN_WATCH_SECONDS: 30,
  MIN_PROGRESS_RATIO: 0.1,
  DEDUP_WINDOW_MS: 10 * 60 * 1000,
  MAX_DELTA_SECONDS: 5
} as const

function loadHistoryFromStorage(): HistoryVideo[] {
  try {
    const stored = localStorage.getItem('playHistory')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    logger.warn('Failed to load play history:', e)
  }
  return []
}

function saveHistoryToStorage(history: HistoryVideo[]) {
  try {
    localStorage.setItem('playHistory', JSON.stringify(history))
  } catch (e) {
    logger.warn('Failed to save play history:', e)
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

  // ========== 播放历史记录 ==========
  const playHistory = ref<HistoryVideo[]>(loadHistoryFromStorage())

  // ========== 历史导航状态 ==========
  // -1 表示不在历史导航模式，>=0 表示正在浏览历史（值为历史索引）
  const historyNavigationIndex = ref(-1)

  // ========== 计算属性 ==========
  const hasVideo = computed(() => currentVideo.value !== null)
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

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

  function syncNativePlaybackState() {
    window.electronAPI.nativePlayer.updateState({
      hasVideo: hasVideo.value,
      hasNext: hasNext.value,
      hasPrevious: hasPrevious.value,
      title: currentVideo.value?.title || '',
      author: currentVideo.value?.author || '',
      isPlaying: isPlaying.value,
      isMuted: isMuted.value,
      volume: volume.value
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
      ...video,
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

  // ========== 播放控制 ==========

  async function saveCurrentPosition(
    video: ExtractedVideo | null = currentVideo.value,
    time: number = currentTime.value,
    dur: number = duration.value
  ) {
    if (!video || !appSettings.rememberPosition) return
    if (time > 0 && dur > 0) {
      try {
        // 如果当前时间超过视频时长的95%，视为已播放完成，清除位置记录
        if (time >= dur * PLAYBACK_CONFIG.COMPLETION_THRESHOLD) {
          await window.electronAPI.store.clearPlayPosition(video.bvid)
        } else {
          await window.electronAPI.store.savePlayPosition(video.bvid, time, dur)
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
  async function restorePlayPosition(video: ExtractedVideo): Promise<void> {
    if (!appSettings.rememberPosition) return

    try {
      const position = await window.electronAPI.store.getPlayPosition(video.bvid)
      if (!position || position.currentTime <= 0 || position.duration <= 0) return

      const progressPercent = position.currentTime / position.duration

      // 如果进度超过90%，视为已播放完成，不恢复
      if (progressPercent >= PLAYBACK_CONFIG.MAX_RESUME_PROGRESS) return

      // 限制恢复时间不超过99%，且至少10秒才恢复
      const resumeTime = Math.min(
        position.currentTime,
        position.duration * PLAYBACK_CONFIG.RESUME_TIME_CAP
      )
      if (resumeTime > PLAYBACK_CONFIG.MIN_RESUME_TIME) {
        pendingResumeTime = resumeTime
      }
    } catch (e) {
      logger.warn('Failed to restore play position:', e)
    }
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
      const lastPlayed = playHistory.value[0]
      if (!lastPlayed) return false

      let position = null
      if (appSettings.rememberPosition) {
        position = await window.electronAPI.store.getPlayPosition(lastPlayed.bvid)
        if (position && position.currentTime > 0 && position.duration > 0) {
          const progressPercent = position.currentTime / position.duration
          if (progressPercent >= PLAYBACK_CONFIG.COMPLETION_THRESHOLD) {
            logger.info('Last played video was completed, not restoring')
            return false
          }
        }
      }

      actualQueue.value = buildActualQueue(lastPlayed, [], 'history')
      currentIndex.value = 0
      historyNavigationIndex.value = -1

      currentVideo.value = actualQueue.value[0]
      isLoading.value = true
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      resetPlaySession()
      await loadPlaySessionStats(lastPlayed.bvid)

      if (position && position.currentTime > PLAYBACK_CONFIG.MIN_RESUME_TIME) {
        pendingResumeTime = Math.min(
          position.currentTime,
          position.duration * PLAYBACK_CONFIG.RESUME_TIME_CAP
        )
      }

      const shouldAutoPlay = appSettings.autoPlay
      window.electronAPI.search.playVideo(lastPlayed.bvid, shouldAutoPlay)
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
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
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
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    // 恢复播放位置
    await restorePlayPosition(video)

    // 添加到播放历史记录
    addToHistory(video)

    syncNativePlaybackState()
    window.electronAPI.search.playVideo(video.bvid)
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
    stopAutoSave()
    await saveCurrentPosition()
    window.electronAPI.search.pauseVideo()
    currentVideo.value = null
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
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
    }

    currentVideo.value = video
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    // 恢复播放位置
    await restorePlayPosition(video)

    // 添加到播放历史
    addToHistory(video)

    syncNativePlaybackState()
    window.electronAPI.search.playVideo(video.bvid)
  }

  // 从历史记录中播放（用于 previous）
  async function playVideoFromHistory(video: HistoryVideo) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    // 保存上一个视频的位置
    if (previousVideo && previousVideo.bvid !== video.bvid && previousTime > 0) {
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
    }

    // 转换为队列视频
    const queueVideo: QueueVideo = {
      ...video,
      source: 'history',
      isFromUserQueue: userQueue.value.some((v) => v.bvid === video.bvid)
    }

    currentVideo.value = queueVideo
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    pendingResumeTime = null
    resetPlaySession()
    await loadPlaySessionStats(video.bvid)

    // 恢复播放位置
    await restorePlayPosition(video)

    // 注意：从历史播放时，不添加到历史，避免重复
    syncNativePlaybackState()
    window.electronAPI.search.playVideo(video.bvid)
  }

  function toggleRepeat() {
    isRepeat.value = !isRepeat.value
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value
  }

  // ========== 播放历史记录 ==========

  function addToHistory(video: ExtractedVideo) {
    // 移除重复项
    const existingIndex = playHistory.value.findIndex((v) => v.bvid === video.bvid)
    if (existingIndex === 0) {
      playHistory.value[0] = {
        ...playHistory.value[0],
        ...video,
        playedAt: Date.now()
      }
      saveHistoryToStorage(playHistory.value)
      return
    }
    if (existingIndex > -1) {
      playHistory.value.splice(existingIndex, 1)
    }

    // 添加到开头
    playHistory.value.unshift({
      ...video,
      playedAt: Date.now()
    })

    // 限制大小
    if (playHistory.value.length > MAX_HISTORY_SIZE) {
      playHistory.value = playHistory.value.slice(0, MAX_HISTORY_SIZE)
    }

    // 持久化到本地存储
    saveHistoryToStorage(playHistory.value)
  }

  function removeFromHistory(bvid: string) {
    const index = playHistory.value.findIndex((v) => v.bvid === bvid)
    if (index > -1) {
      playHistory.value.splice(index, 1)
      saveHistoryToStorage(playHistory.value)
      syncNativePlaybackState()
    }
  }

  function clearHistory() {
    playHistory.value = []
    saveHistoryToStorage(playHistory.value)
    syncNativePlaybackState()
  }

  function loadHistory() {
    playHistory.value = loadHistoryFromStorage()
    syncNativePlaybackState()
  }

  function updateVideoDuration(bvid: string, durationSeconds: number) {
    const formattedDuration = formatDuration(durationSeconds)

    const historyIndex = playHistory.value.findIndex((v) => v.bvid === bvid)
    if (historyIndex !== -1 && playHistory.value[historyIndex].duration !== formattedDuration) {
      playHistory.value[historyIndex].duration = formattedDuration
      saveHistoryToStorage(playHistory.value)
    }

    void window.electronAPI.store.updateFavoriteDuration(bvid, formattedDuration)
    void window.electronAPI.store.updatePlaylistVideoDuration(bvid, formattedDuration)
  }

  // ========== 用户维护的播放队列 ==========

  async function addToUserQueue(video: ExtractedVideo) {
    if (userQueue.value.find((v) => v.bvid === video.bvid)) {
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
      logger.info('Loading user queue from store...')
      const queue = await window.electronAPI.store.getUserQueue()
      logger.info(`Loaded user queue: ${queue.length} items`)
      userQueue.value = queue
    } catch (e) {
      logger.warn('Failed to load user queue:', e)
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

  // 播放完成后的处理
  async function handleVideoComplete() {
    const video = currentVideo.value
    if (video) {
      const index = userQueue.value.findIndex((v) => v.bvid === video.bvid)
      if (index > -1) {
        userQueue.value.splice(index, 1)
        try {
          await window.electronAPI.store.removeFromUserQueue(video.bvid)
        } catch (e) {
          logger.warn('Failed to save user queue:', e)
        }

        syncNativePlaybackState()
      }
    }

    // 清除播放位置记录
    if (currentVideo.value && appSettings.rememberPosition) {
      window.electronAPI.store.clearPlayPosition(currentVideo.value.bvid)
    }

    // 自动播放下一首
    next()
  }

  // ========== 事件监听 ==========

  function setReadyListener() {
    const unsubscribe = window.electronAPI.search.onPlayerReady(() => {
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

    return unsubscribe
  }

  function setProgressListener() {
    const unsubscribe = window.electronAPI.search.onPlayerProgress((progress: PlayerProgress) => {
      // 如果没有当前视频，不更新进度（避免stop()后进度被重新设置）
      if (!currentVideo.value) return

      currentTime.value = progress.currentTime
      duration.value = progress.duration || 0
      isPlaying.value = !progress.paused
      syncNativePlaybackState()

      if (progress.duration > 0) {
        updateVideoDuration(currentVideo.value.bvid, progress.duration)
      }

      const now = Date.now()
      let deltaSeconds = 0
      let activePlayback = false
      if (sessionLastProgressAt === null) {
        sessionLastProgressAt = now
      } else {
        deltaSeconds = Math.min(
          (now - sessionLastProgressAt) / 1000,
          PLAY_STATS_CONFIG.MAX_DELTA_SECONDS
        )
        sessionLastProgressAt = now
        if (!progress.paused && deltaSeconds > 0) {
          activePlayback = true
          sessionWatchSeconds += deltaSeconds
          void window.electronAPI.store.updateWatchTime(
            currentVideo.value.bvid,
            deltaSeconds,
            progress.duration || 0,
            progress.currentTime
          )
        }
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
        // 如果开启了循环播放，则重新播放当前视频
        if (isRepeat.value) {
          seek(0)
          play()
        } else {
          // 播放完成，处理下一首
          handleVideoComplete()
        }
      }
    })

    return unsubscribe
  }

  async function getCurrentPlayStats() {
    if (!currentVideo.value) return null
    return window.electronAPI.store.getPlayStats(currentVideo.value.bvid)
  }

  return {
    // 基础状态
    currentVideo,
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

    // 播放历史记录
    playHistory,

    // 播放控制
    saveCurrentPosition,
    playVideo,
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
