import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<ExtractedVideo[]>([])
  const isSearching = ref(false)
  const isLoadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(false)
  const currentPage = ref(1)
  const lastSearchTime = ref<number | null>(null)
  const searchHistory = ref<string[]>([])
  const maxHistorySize = 20

  const hasResults = computed(() => results.value.length > 0)
  const resultCount = computed(() => results.value.length)

  function addToHistory(searchQuery: string) {
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    
    const index = searchHistory.value.indexOf(trimmed)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
    
    searchHistory.value.unshift(trimmed)
    
    if (searchHistory.value.length > maxHistorySize) {
      searchHistory.value = searchHistory.value.slice(0, maxHistorySize)
    }
    
    saveHistory()
  }

  function removeFromHistory(searchQuery: string) {
    const index = searchHistory.value.indexOf(searchQuery)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
      saveHistory()
    }
  }

  function clearHistory() {
    searchHistory.value = []
    saveHistory()
  }

  function saveHistory() {
    try {
      localStorage.setItem('blipod_search_history', JSON.stringify(searchHistory.value))
    } catch {
      // ignore
    }
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem('blipod_search_history')
      if (stored) {
        searchHistory.value = JSON.parse(stored)
      }
    } catch {
      // ignore
    }
  }

  async function search(searchQuery: string): Promise<void> {
    if (!searchQuery.trim()) return
    
    query.value = searchQuery.trim()
    isSearching.value = true
    error.value = null
    results.value = []
    currentPage.value = 1
    
    addToHistory(query.value)

    try {
      const result = await window.electronAPI.search.search(query.value, 1)
      
      if (result.success) {
        results.value = result.videos
        hasMore.value = result.videos.length >= 20
        lastSearchTime.value = result.extractedAt
      } else {
        error.value = result.error || 'Search failed'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error occurred'
    } finally {
      isSearching.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (isLoadingMore.value || !hasMore.value) return
    
    isLoadingMore.value = true
    const nextPage = currentPage.value + 1
    
    try {
      const result = await window.electronAPI.search.search(query.value, nextPage)
      
      if (result.success) {
        const newVideos = result.videos.filter(
          (v: ExtractedVideo) => !results.value.find(r => r.bvid === v.bvid)
        )
        results.value = [...results.value, ...newVideos]
        currentPage.value = nextPage
        hasMore.value = result.videos.length >= 20
        lastSearchTime.value = result.extractedAt
      } else {
        error.value = result.error || 'Failed to load more'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error occurred'
    } finally {
      isLoadingMore.value = false
    }
  }

  function clearResults() {
    results.value = []
    query.value = ''
    error.value = null
    hasMore.value = false
    currentPage.value = 1
    lastSearchTime.value = null
  }

  function setResultListener() {
    const unsubscribe = window.electronAPI.search.onSearchResult((result: SearchResult) => {
      if (result.success) {
        if (result.page && result.page > 1) {
          const newVideos = result.videos.filter(
            (v: ExtractedVideo) => !results.value.find(r => r.bvid === v.bvid)
          )
          results.value = [...results.value, ...newVideos]
          currentPage.value = result.page
        } else {
          results.value = result.videos
          currentPage.value = result.page || 1
        }
        hasMore.value = result.videos.length >= 20
        lastSearchTime.value = result.extractedAt
      } else {
        error.value = result.error || 'Search failed'
      }
      isSearching.value = false
      isLoadingMore.value = false
    })
    
    return unsubscribe
  }

  loadHistory()

  return {
    query,
    results,
    isSearching,
    isLoadingMore,
    error,
    hasMore,
    currentPage,
    lastSearchTime,
    searchHistory,
    hasResults,
    resultCount,
    search,
    loadMore,
    clearResults,
    addToHistory,
    removeFromHistory,
    clearHistory,
    setResultListener,
  }
})
