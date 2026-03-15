import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppSettingsStore } from './appSettings'
import { logger } from '../utils/logger'

export interface HistoryVideo extends ExtractedVideo {
  playedAt: number
}

const MAX_HISTORY_SIZE = 100
const MAX_QUEUE_SIZE = 50

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

export const usePlayerStore = defineStore('player', () => {
  const appSettings = useAppSettingsStore()
  const currentVideo = ref<ExtractedVideo | null>(null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(80)
  const isMuted = ref(false)
  const playbackRate = ref(1)
  const playlist = ref<ExtractedVideo[]>([])
  const currentIndex = ref(-1)
  const isRepeat = ref(false)
  const isShuffle = ref(false)

  // 播放历史记录
  const playHistory = ref<HistoryVideo[]>(loadHistoryFromStorage())

  // 播放队列
  const playQueue = ref<ExtractedVideo[]>([])
  const isPlayingFromQueue = ref(false)

  const hasVideo = computed(() => currentVideo.value !== null)
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })
  const hasNext = computed(() => {
    if (isShuffle.value) return playlist.value.length > 1
    return currentIndex.value < playlist.value.length - 1
  })
  const hasPrevious = computed(() => {
    if (isShuffle.value) return playlist.value.length > 1
    return currentIndex.value > 0
  })

  let pendingResumeTime: number | null = null

  async function saveCurrentPosition(
    video: ExtractedVideo | null = currentVideo.value,
    time: number = currentTime.value,
    dur: number = duration.value
  ) {
    if (!video || !appSettings.rememberPosition) return
    if (time > 0 && dur > 0) {
      try {
        await window.electronAPI.store.savePlayPosition(video.bvid, time, dur)
      } catch (e) {
        logger.warn('Failed to save play position:', e)
      }
    }
  }

  async function playVideo(video: ExtractedVideo, videoList?: ExtractedVideo[]) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    // 只有在切换不同视频时才保存上一个视频的位置
    // 如果是同一个视频重新播放（如播放完成后再次点击），不保存位置，避免覆盖已清除的记录
    if (previousVideo && previousVideo.bvid !== video.bvid && previousTime > 0) {
      await saveCurrentPosition(previousVideo, previousTime, previousDuration)
    }

    currentVideo.value = video
    isLoading.value = true
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    pendingResumeTime = null

    if (videoList) {
      playlist.value = videoList
      currentIndex.value = videoList.findIndex((v: ExtractedVideo) => v.bvid === video.bvid)
    }

    if (appSettings.rememberPosition) {
      try {
        const position = await window.electronAPI.store.getPlayPosition(video.bvid)
        if (position && position.currentTime > 0 && position.duration > 0) {
          const resumeTime = Math.min(position.currentTime, position.duration * 0.99)
          if (resumeTime > 10) {
            pendingResumeTime = resumeTime
          }
        }
      } catch (e) {
        logger.warn('Failed to restore play position:', e)
      }
    }

    // 添加到播放历史记录
    addToHistory(video)

    window.electronAPI.search.playVideo(video.bvid)
  }

  function play() {
    if (!isPlaying.value) {
      window.electronAPI.search.resumeVideo()
      isPlaying.value = true
    }
  }

  async function pause() {
    if (isPlaying.value) {
      window.electronAPI.search.pauseVideo()
      isPlaying.value = false
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
    await saveCurrentPosition()
    window.electronAPI.search.pauseVideo()
    currentVideo.value = null
    isPlaying.value = false
    isLoading.value = false
    currentTime.value = 0
    duration.value = 0
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
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    window.electronAPI.search.setVolume(isMuted.value ? 0 : volume.value)
  }

  function setPlaybackRate(rate: number) {
    playbackRate.value = Math.max(0.25, Math.min(2, rate))
  }

  function next() {
    // 如果正在播放队列，优先播放队列中的下一首
    if (isPlayingFromQueue.value && currentIndex.value < playQueue.value.length - 1) {
      currentIndex.value++
      const video = playQueue.value[currentIndex.value]
      playVideo(video, playQueue.value)
      return
    }

    if (!hasNext.value) return

    // 退出队列播放模式
    isPlayingFromQueue.value = false

    if (isShuffle.value) {
      const randomIndex = Math.floor(Math.random() * playlist.value.length)
      const video = playlist.value[randomIndex]
      playVideo(video, playlist.value)
    } else {
      currentIndex.value++
      const video = playlist.value[currentIndex.value]
      playVideo(video, playlist.value)
    }
  }

  function previous() {
    // 如果正在播放队列，优先播放队列中的上一首
    if (isPlayingFromQueue.value && currentIndex.value > 0) {
      currentIndex.value--
      const video = playQueue.value[currentIndex.value]
      playVideo(video, playQueue.value)
      return
    }

    if (!hasPrevious.value) return

    // 退出队列播放模式
    isPlayingFromQueue.value = false

    if (isShuffle.value) {
      const randomIndex = Math.floor(Math.random() * playlist.value.length)
      const video = playlist.value[randomIndex]
      playVideo(video, playlist.value)
    } else {
      currentIndex.value--
      const video = playlist.value[currentIndex.value]
      playVideo(video, playlist.value)
    }
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
    const existingIndex = playHistory.value.findIndex(v => v.bvid === video.bvid)
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
    const index = playHistory.value.findIndex(v => v.bvid === bvid)
    if (index > -1) {
      playHistory.value.splice(index, 1)
      saveHistoryToStorage(playHistory.value)
    }
  }

  function clearHistory() {
    playHistory.value = []
    saveHistoryToStorage(playHistory.value)
  }

  // ========== 播放队列 ==========
  function addToQueue(video: ExtractedVideo) {
    if (playQueue.value.find(v => v.bvid === video.bvid)) {
      return false
    }
    if (playQueue.value.length >= MAX_QUEUE_SIZE) {
      return false
    }
    playQueue.value.push(video)
    return true
  }

  function removeFromQueue(bvid: string) {
    const index = playQueue.value.findIndex(v => v.bvid === bvid)
    if (index > -1) {
      playQueue.value.splice(index, 1)
      // 如果正在播放队列且删除的是当前播放之前的视频，需要调整索引
      if (isPlayingFromQueue.value && currentIndex.value > index) {
        currentIndex.value--
      }
    }
  }

  function clearQueue() {
    playQueue.value = []
    if (isPlayingFromQueue.value) {
      isPlayingFromQueue.value = false
    }
  }

  function playFromQueue(index: number) {
    if (index >= 0 && index < playQueue.value.length) {
      isPlayingFromQueue.value = true
      const video = playQueue.value[index]
      playVideo(video, playQueue.value)
    }
  }

  function moveQueueItem(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= playQueue.value.length) return
    if (toIndex < 0 || toIndex >= playQueue.value.length) return
    if (fromIndex === toIndex) return

    const item = playQueue.value[fromIndex]
    playQueue.value.splice(fromIndex, 1)
    playQueue.value.splice(toIndex, 0, item)

    // 调整 currentIndex
    if (isPlayingFromQueue.value) {
      if (currentIndex.value === fromIndex) {
        currentIndex.value = toIndex
      } else if (fromIndex < currentIndex.value && toIndex >= currentIndex.value) {
        currentIndex.value--
      } else if (fromIndex > currentIndex.value && toIndex <= currentIndex.value) {
        currentIndex.value++
      }
    }
  }

  function addToPlaylist(video: ExtractedVideo) {
    if (!playlist.value.find((v: ExtractedVideo) => v.bvid === video.bvid)) {
      playlist.value.push(video)
    }
  }

  function removeFromPlaylist(bvid: string) {
    const index = playlist.value.findIndex((v: ExtractedVideo) => v.bvid === bvid)
    if (index > -1) {
      playlist.value.splice(index, 1)
      if (currentIndex.value >= index) {
        currentIndex.value--
      }
    }
  }

  function clearPlaylist() {
    playlist.value = []
    currentIndex.value = -1
  }

  function setReadyListener() {
    const unsubscribe = window.electronAPI.search.onPlayerReady(() => {
      isLoading.value = false
      isPlaying.value = true
      window.electronAPI.search.setVolume(volume.value)

      if (pendingResumeTime !== null) {
        const targetTime = pendingResumeTime
        pendingResumeTime = null
        setTimeout(() => {
          window.electronAPI.search.seekVideo(targetTime)
        }, 100)
      }
    })

    return unsubscribe
  }

  function setProgressListener() {
    const unsubscribe = window.electronAPI.search.onPlayerProgress((progress: PlayerProgress) => {
      currentTime.value = progress.currentTime
      duration.value = progress.duration || 0
      isPlaying.value = !progress.paused

      // 检测视频是否播放完成（播放进度超过99%且处于暂停状态）
      if (progress.duration > 0 &&
          progress.currentTime >= progress.duration * 0.99 &&
          progress.paused &&
          currentVideo.value) {
        // 如果开启了循环播放，则重新播放当前视频
        if (isRepeat.value) {
          seek(0)
          play()
        } else if (appSettings.rememberPosition) {
          // 清除该视频的播放位置记录，下次播放将从开头开始
          window.electronAPI.store.clearPlayPosition(currentVideo.value.bvid)
        }
      }
    })

    return unsubscribe
  }

  return {
    currentVideo,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playlist,
    currentIndex,
    isRepeat,
    isShuffle,
    hasVideo,
    progress,
    hasNext,
    hasPrevious,
    // 播放历史记录
    playHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    // 播放队列
    playQueue,
    isPlayingFromQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
    moveQueueItem,
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
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    setReadyListener,
    setProgressListener,
  }
})
