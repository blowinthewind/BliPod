import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAppSettingsStore } from './appSettings'

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
        console.error('Failed to save play position:', e)
      }
    }
  }

  async function playVideo(video: ExtractedVideo, videoList?: ExtractedVideo[]) {
    const previousVideo = currentVideo.value
    const previousTime = currentTime.value
    const previousDuration = duration.value

    if (previousVideo && previousTime > 0) {
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
        console.error('Failed to restore play position:', e)
      }
    }

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
    if (!hasNext.value) return

    if (isShuffle.value) {
      const randomIndex = Math.floor(Math.random() * playlist.value.length)
      const video = playlist.value[randomIndex]
      playVideo(video)
    } else {
      currentIndex.value++
      const video = playlist.value[currentIndex.value]
      playVideo(video)
    }
  }

  function previous() {
    if (!hasPrevious.value) return

    if (isShuffle.value) {
      const randomIndex = Math.floor(Math.random() * playlist.value.length)
      const video = playlist.value[randomIndex]
      playVideo(video)
    } else {
      currentIndex.value--
      const video = playlist.value[currentIndex.value]
      playVideo(video)
    }
  }

  function toggleRepeat() {
    isRepeat.value = !isRepeat.value
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value
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
    saveCurrentPosition,
    playVideo,
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekByPercent,
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
