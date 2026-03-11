import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<ExtractedVideo[]>([])
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(false)
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
    
    addToHistory(query.value)

    try {
      const result = await window.electronAPI.search.search(query.value)
      
      if (result.success) {
        results.value = result.videos
        hasMore.value = result.hasMore
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

  function clearResults() {
    results.value = []
    query.value = ''
    error.value = null
    hasMore.value = false
    lastSearchTime.value = null
  }

  function setResultListener() {
    const unsubscribe = window.electronAPI.search.onSearchResult((result: SearchResult) => {
      if (result.success) {
        results.value = result.videos
        hasMore.value = result.hasMore
        lastSearchTime.value = result.extractedAt
      } else {
        error.value = result.error || 'Search failed'
      }
      isSearching.value = false
    })
    
    return unsubscribe
  }

  loadHistory()

  return {
    query,
    results,
    isSearching,
    error,
    hasMore,
    lastSearchTime,
    searchHistory,
    hasResults,
    resultCount,
    search,
    clearResults,
    addToHistory,
    removeFromHistory,
    clearHistory,
    setResultListener,
  }
})
