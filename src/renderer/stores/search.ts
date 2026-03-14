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
  const nextOffset = ref<number | null>(null)
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
    nextOffset.value = null
    
    addToHistory(query.value)

    try {
      const result = await window.electronAPI.search.search(query.value)
      
      if (result.success) {
        results.value = result.videos
        hasMore.value = result.videos.length >= 20
        lastSearchTime.value = result.extractedAt
        currentPage.value = result.currentPage
        nextOffset.value = result.nextOffset
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
    
    window.electronAPI.search.clickNextPage()
  }

  function clearResults() {
    results.value = []
    query.value = ''
    error.value = null
    hasMore.value = false
    currentPage.value = 1
    nextOffset.value = null
    lastSearchTime.value = null
  }

  function setResultListener() {
    const unsubscribe = window.electronAPI.search.onSearchResult((result: SearchResult) => {
      if (result.success) {
        if (isLoadingMore.value) {
          const newVideos = result.videos.filter(
            (v: ExtractedVideo) => !results.value.find(r => r.bvid === v.bvid)
          )
          results.value = [...results.value, ...newVideos]
        } else {
          results.value = result.videos
          currentPage.value = 1
        }
        currentPage.value = result.currentPage
        nextOffset.value = result.nextOffset
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

  function setViewDestroyedListener(onDestroyed?: (data: { message: string; lastQuery: string }) => void) {
    const unsubscribe = window.electronAPI.search.onViewDestroyed((data) => {
      // searchView 被销毁，显示提示并保存上次搜索词
      error.value = data.message
      // 将上次搜索词填入搜索栏（即使已有搜索词也更新，确保是最新的）
      if (data.lastQuery) {
        query.value = data.lastQuery
      }
      isLoadingMore.value = false
      // 调用外部回调（用于更新UI）
      if (onDestroyed) {
        onDestroyed(data)
      }
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
    nextOffset,
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
    setViewDestroyedListener,
  }
})
