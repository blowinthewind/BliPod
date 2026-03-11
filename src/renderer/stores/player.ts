import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePlayerStore = defineStore('player', () => {
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

  function playVideo(video: ExtractedVideo, videoList?: ExtractedVideo[]) {
    currentVideo.value = video
    isLoading.value = true
    isPlaying.value = false
    
    if (videoList) {
      playlist.value = videoList
      currentIndex.value = videoList.findIndex(v => v.bvid === video.bvid)
    }
    
    window.electronAPI.search.playVideo(video.bvid)
  }

  function play() {
    isPlaying.value = true
  }

  function pause() {
    isPlaying.value = false
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function stop() {
    currentVideo.value = null
    isPlaying.value = false
    isLoading.value = false
    currentTime.value = 0
    duration.value = 0
  }

  function seek(time: number) {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
  }

  function seekByPercent(percent: number) {
    seek((percent / 100) * duration.value)
  }

  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(100, value))
    if (volume.value > 0) {
      isMuted.value = false
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
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
    if (!playlist.value.find(v => v.bvid === video.bvid)) {
      playlist.value.push(video)
    }
  }

  function removeFromPlaylist(bvid: string) {
    const index = playlist.value.findIndex(v => v.bvid === bvid)
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
  }
})
