import { ref, onUnmounted } from 'vue'
import { useSearchStore } from '../stores/search'
import { usePlayerStore } from '../stores/player'

export interface UseSearchOptions {
  maxRetries?: number
  retryDelay?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const { maxRetries = 3, retryDelay = 1000 } = options
  
  const searchStore = useSearchStore()
  const playerStore = usePlayerStore()
  
  const retryCount = ref(0)
  const isRetrying = ref(false)

  let searchUnsubscribe: (() => void) | null = null
  let playerUnsubscribe: (() => void) | null = null

  function setupListeners() {
    searchUnsubscribe = searchStore.setResultListener()
    playerUnsubscribe = playerStore.setReadyListener()
  }

  function cleanupListeners() {
    if (searchUnsubscribe) {
      searchUnsubscribe()
      searchUnsubscribe = null
    }
    if (playerUnsubscribe) {
      playerUnsubscribe()
      playerUnsubscribe = null
    }
  }

  async function searchWithRetry(query: string): Promise<boolean> {
    retryCount.value = 0
    isRetrying.value = false
    
    while (retryCount.value <= maxRetries) {
      try {
        await searchStore.search(query)
        
        if (!searchStore.error) {
          return true
        }
        
        if (retryCount.value < maxRetries) {
          isRetrying.value = true
          retryCount.value++
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount.value))
        } else {
          break
        }
      } catch (error) {
        if (retryCount.value < maxRetries) {
          isRetrying.value = true
          retryCount.value++
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount.value))
        } else {
          throw error
        }
      }
    }
    
    return false
  }

  function playVideo(bvid: string) {
    const video = searchStore.results.find((v: ExtractedVideo) => v.bvid === bvid)
    if (video) {
      playerStore.playVideo(video, searchStore.results)
    }
  }

  function playNext() {
    playerStore.next()
  }

  function playPrevious() {
    playerStore.previous()
  }

  onUnmounted(() => {
    cleanupListeners()
  })

  return {
    searchStore,
    playerStore,
    retryCount,
    isRetrying,
    setupListeners,
    cleanupListeners,
    searchWithRetry,
    playVideo,
    playNext,
    playPrevious,
  }
}
