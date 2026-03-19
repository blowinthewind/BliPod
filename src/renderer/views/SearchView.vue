<script setup lang="ts">
  import {
    Search,
    Loader2,
    Play,
    AlertCircle,
    Clock,
    X,
    History,
    ChevronDown,
    Heart,
    ListPlus,
    ListCheck,
    ListMusic,
    Check
  } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
  import { ref, onMounted, onUnmounted, computed, toRaw } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useSearch } from '../composables/useSearch'
  import { useFavoritesStore } from '../stores/favorites'
  import { usePlaylistsStore } from '../stores/playlists'
  import { usePlayerStore } from '../stores/player'
  import AddToPlaylistDialog from '../components/Playlist/AddToPlaylistDialog.vue'
  import type { ExtractedVideo } from '../../preload/preload'

  const router = useRouter()
  const route = useRoute()

  const {
    searchStore,
    retryCount,
    isRetrying,
    setupListeners,
    cleanupListeners,
    searchWithRetry,
    playVideo
  } = useSearch({ maxRetries: 3, retryDelay: 1000 })

  // 用于 viewDestroyed 监听器的取消函数
  let viewDestroyedUnsubscribe: (() => void) | null = null

  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const playerStore = usePlayerStore()

  const searchQuery = ref('')
  const showHistory = ref(false)
  const showPlaylistDialog = ref(false)
  const selectedVideo = ref<ExtractedVideo | null>(null)
  const searchInputRef = ref<HTMLInputElement | null>(null)

  const hasError = computed(() => searchStore.error !== null)
  const errorMessage = computed(() => searchStore.error || '')

  onMounted(() => {
    setupListeners()
    favoritesStore.loadFavorites()
    playlistsStore.loadPlaylists()
    if (route.query.focus === 'true') {
      searchInputRef.value?.focus()
    }
    viewDestroyedUnsubscribe = searchStore.setViewDestroyedListener((data) => {
      // 更新搜索栏的值
      if (data.lastQuery) {
        searchQuery.value = data.lastQuery
      }
      // 滚动到页面顶部 - 使用 MainLayout 中的 content-area 容器
      setTimeout(() => {
        const contentArea = document.querySelector('.content-area')
        if (contentArea) {
          contentArea.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 100)
    })
  })

  onUnmounted(() => {
    cleanupListeners()
    // 清理 viewDestroyed 监听器
    if (viewDestroyedUnsubscribe) {
      viewDestroyedUnsubscribe()
      viewDestroyedUnsubscribe = null
    }
  })

  async function handleSearch() {
    if (!searchQuery.value.trim()) return
    showHistory.value = false
    await searchWithRetry(searchQuery.value)
  }

  function handlePlay(bvid: string) {
    playVideo(bvid)
  }

  function handleHistoryClick(query: string) {
    searchQuery.value = query
    showHistory.value = false
    handleSearch()
  }

  function removeHistoryItem(query: string, event: Event) {
    event.stopPropagation()
    searchStore.removeFromHistory(query)
  }

  function clearAllHistory() {
    searchStore.clearHistory()
    showHistory.value = false
  }

  function focusInput() {
    showHistory.value = searchStore.searchHistory.length > 0
  }

  function blurInput() {
    setTimeout(() => {
      showHistory.value = false
    }, 200)
  }

  async function handleLoadMore() {
    await searchStore.loadMore()
  }

  function handleAuthorClick(authorLink: string, event: Event) {
    event.stopPropagation()
    if (authorLink) {
      const midMatch = authorLink.match(/space\.bilibili\.com\/(\d+)/)
      if (midMatch) {
        const mid = midMatch[1]
        router.push({ name: 'uploader', params: { mid } })
      }
    }
  }

  async function toggleFavorite(video: ExtractedVideo, event: Event) {
    event.stopPropagation()
    if (favoritesStore.isFavoriteSync(video.bvid)) {
      await favoritesStore.removeFavorite(video.bvid)
    } else {
      const rawVideo = toRaw(video)
      await favoritesStore.addFavorite(rawVideo)
    }
  }

  function isFavorite(bvid: string): boolean {
    return favoritesStore.isFavoriteSync(bvid)
  }

  function openPlaylistDialog(video: ExtractedVideo, event: Event) {
    event.stopPropagation()
    selectedVideo.value = video
    showPlaylistDialog.value = true
  }

  function closePlaylistDialog() {
    showPlaylistDialog.value = false
    selectedVideo.value = null
  }

  async function addToQueue(video: ExtractedVideo, event: Event) {
    event.stopPropagation()
    const success = await playerStore.addToUserQueue(video)
    if (success) {
      // 可以添加提示
    }
  }

  function isInQueue(bvid: string): boolean {
    return playerStore.userQueue.some((v) => v.bvid === bvid)
  }
</script>

<template>
  <div class="search-view">
    <div class="search-header">
      <h1 class="page-title">Search</h1>
      <p class="page-desc">Search Bilibili videos</p>
    </div>

    <div class="search-box">
      <div class="search-input-wrapper">
        <label class="sr-only" for="search-query-input">搜索关键词</label>
        <Search :size="20" class="search-icon" />
        <input
          id="search-query-input"
          ref="searchInputRef"
          type="text"
          class="search-input"
          placeholder="Enter keywords to search..."
          aria-label="搜索关键词"
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          @focus="focusInput"
          @blur="blurInput"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          type="button"
          aria-label="清空搜索关键词"
          @click="searchQuery = ''"
        >
          <X :size="16" />
        </button>
      </div>
      <button class="search-btn" @click="handleSearch" :disabled="searchStore.isSearching">
        <Loader2 v-if="searchStore.isSearching" :size="18" class="animate-spin" />
        <span v-else>Search</span>
      </button>

      <div v-if="showHistory && searchStore.searchHistory.length > 0" class="history-dropdown">
        <div class="history-header">
          <span class="history-title">
            <History :size="14" />
            Search History
          </span>
          <button class="clear-history-btn" @click="clearAllHistory">Clear All</button>
        </div>
        <div class="history-list">
          <div v-for="item in searchStore.searchHistory" :key="item" class="history-item">
            <button
              class="history-item-main"
              type="button"
              :aria-label="`搜索历史：${item}`"
              @click="handleHistoryClick(item)"
            >
              <Clock :size="14" class="history-icon" />
              <span class="history-text">{{ item }}</span>
            </button>
            <button
              class="remove-history-btn"
              type="button"
              :aria-label="`从搜索历史中移除 ${item}`"
              @click="removeHistoryItem(item, $event)"
            >
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="hasError"
      class="error-message"
      :class="{ 'timeout-error': errorMessage.includes('超时') }"
    >
      <AlertCircle :size="20" />
      <span>{{ errorMessage }}</span>
      <span v-if="isRetrying" class="retry-info">(Retrying... {{ retryCount }}/3)</span>
    </div>

    <div class="search-results" v-if="searchStore.hasResults">
      <div class="results-header">
        <span class="results-count">Found {{ searchStore.resultCount }} results</span>
        <span v-if="searchStore.currentPage > 1" class="page-info"
          >Page {{ searchStore.currentPage }}</span
        >
      </div>

      <div class="results-list">
        <div v-for="result in searchStore.results" :key="result.bvid" class="result-item">
          <button
            class="result-main"
            type="button"
            :aria-label="`播放搜索结果 ${result.title}`"
            @click="handlePlay(result.bvid)"
          >
            <div class="result-cover">
              <LazyImage
                v-if="result.cover"
                :src="result.cover"
                :alt="result.title"
                :width="320"
                aspect-ratio="16/9"
                placeholder-icon="play"
              />
              <div v-else class="cover-placeholder">
                <Play :size="24" />
              </div>
              <div class="result-cover-overlay">
                <span class="play-btn-overlay" aria-hidden="true">
                  <Play :size="18" />
                </span>
              </div>
              <span v-if="result.duration" class="duration-badge">{{ result.duration }}</span>
            </div>
            <div class="result-info">
              <h3 class="result-title" :title="result.title">{{ result.title }}</h3>
              <div class="result-meta">
                <button
                  class="meta-item author clickable"
                  type="button"
                  :aria-label="`查看 ${result.author} 的视频`"
                  @click.stop="handleAuthorClick(result.authorLink, $event)"
                >
                  {{ result.author }}
                </button>
                <span class="meta-divider">•</span>
                <span v-if="result.playCount" class="meta-item">{{ result.playCount }} plays</span>
              </div>
            </div>
          </button>
          <button
            class="favorite-btn"
            type="button"
            @click.stop="toggleFavorite(result, $event)"
            :aria-label="
              isFavorite(result.bvid) ? `从收藏中移除 ${result.title}` : `收藏 ${result.title}`
            "
          >
            <Heart :size="16" :fill="isFavorite(result.bvid) ? 'currentColor' : 'none'" />
          </button>
          <button
            class="queue-btn"
            type="button"
            @click.stop="addToQueue(result, $event)"
            :aria-label="
              isInQueue(result.bvid)
                ? `${result.title} 已在播放队列中`
                : `将 ${result.title} 添加到播放队列`
            "
          >
            <Check v-if="isInQueue(result.bvid)" :size="16" />
            <ListMusic v-else :size="16" />
          </button>
          <button
            class="playlist-btn"
            type="button"
            @click.stop="openPlaylistDialog(result, $event)"
            :aria-label="
              playlistsStore.isVideoInAnyPlaylist(result.bvid)
                ? `${result.title} 已添加到播放列表`
                : `将 ${result.title} 添加到播放列表`
            "
          >
            <ListCheck v-if="playlistsStore.isVideoInAnyPlaylist(result.bvid)" :size="16" />
            <ListPlus v-else :size="16" />
          </button>
          <button
            class="play-btn"
            type="button"
            :aria-label="`播放 ${result.title}`"
            @click.stop="handlePlay(result.bvid)"
          >
            <Play :size="18" />
          </button>
        </div>
      </div>

      <div v-if="searchStore.hasMore" class="load-more-container">
        <button class="load-more-btn" @click="handleLoadMore" :disabled="searchStore.isLoadingMore">
          <Loader2 v-if="searchStore.isLoadingMore" :size="18" class="animate-spin" />
          <template v-else>
            <ChevronDown :size="18" />
            <span>Load More</span>
          </template>
        </button>
      </div>
    </div>

    <div class="empty-state" v-else-if="!searchStore.isSearching && !hasError">
      <Search :size="48" class="empty-icon" />
      <h3>Search Bilibili Videos</h3>
      <p>Enter keywords to start searching</p>
    </div>

    <div class="loading-state" v-if="searchStore.isSearching && !searchStore.hasResults">
      <Loader2 :size="32" class="animate-spin" />
      <span>Searching...</span>
    </div>

    <AddToPlaylistDialog
      :visible="showPlaylistDialog"
      :video="selectedVideo"
      @close="closePlaylistDialog"
    />

    <ScrollToButtons
      v-if="searchStore.hasResults && searchStore.results.length > 5"
      scroll-container=".content-area"
      :threshold="5"
    />
  </div>
</template>

<style scoped>
  .search-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 900px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .page-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .search-box {
    display: flex;
    gap: 12px;
    position: relative;
  }

  .search-input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      background-color 0.2s,
      color 0.2s;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.15);
  }

  .search-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    height: 48px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-base);
    outline: none;
  }

  .search-input::placeholder {
    color: var(--text-secondary);
  }

  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .clear-btn:hover {
    background: var(--border);
    color: var(--text-primary);
  }

  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 24px;
    height: 48px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
  }

  .search-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .search-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .history-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 88px;
    margin-top: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 100;
    overflow: hidden;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .history-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .clear-history-btn {
    font-size: var(--text-xs);
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .clear-history-btn:hover {
    text-decoration: underline;
  }

  .history-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    transition: background 0.2s;
  }

  .history-item:hover,
  .history-item:focus-within {
    background: var(--bg-card);
  }

  .history-item-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .history-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .history-text {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .remove-history-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
  }

  .history-item:hover .remove-history-btn,
  .history-item:focus-within .remove-history-btn {
    opacity: 1;
  }

  .remove-history-btn:hover {
    background: var(--border);
    color: var(--text-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: var(--text-sm);
    flex-wrap: wrap;
  }

  .error-message.timeout-error {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }

  .retry-info {
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-subtle, var(--border));
  }

  .results-count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .page-info {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    background: var(--bg-card);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle, transparent);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .result-item:hover,
  .result-item:focus-within {
    background: var(--bg-card);
    border-color: var(--border);
  }

  .result-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .result-cover {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .result-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .result-item:hover .result-cover img,
  .result-item:focus-within .result-cover img {
    transform: scale(1.05);
  }

  .result-cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .result-item:hover .result-cover-overlay,
  .result-item:focus-within .result-cover-overlay {
    opacity: 1;
  }

  .play-btn-overlay {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .play-btn-overlay:hover {
    transform: scale(1.1);
  }

  .cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-secondary);
  }

  .duration-badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 4px;
    font-size: var(--text-xs);
    color: white;
  }

  .result-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .result-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .meta-item.author {
    color: var(--accent);
  }

  .meta-item.author.clickable {
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    transition:
      color 0.2s,
      text-decoration-color 0.2s,
      opacity 0.2s,
      transform 0.2s;
  }

  .meta-item.author.clickable:hover {
    color: var(--accent-hover);
    text-decoration: underline;
  }

  .meta-divider {
    color: var(--border);
  }

  .favorite-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
    flex-shrink: 0;
  }

  .result-item:hover .favorite-btn,
  .result-item:focus-within .favorite-btn {
    opacity: 1;
  }

  .favorite-btn:hover {
    color: var(--accent);
  }

  .favorite-btn:has(svg[fill='currentColor']) {
    color: var(--accent);
    opacity: 1;
  }

  .queue-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
    flex-shrink: 0;
  }

  .result-item:hover .queue-btn,
  .result-item:focus-within .queue-btn {
    opacity: 1;
  }

  .queue-btn:hover {
    color: var(--accent);
    background: var(--bg-primary);
  }

  .queue-btn:has(.lucide-check) {
    color: var(--accent);
    opacity: 1;
  }

  .playlist-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
    flex-shrink: 0;
  }

  .result-item:hover .playlist-btn,
  .result-item:focus-within .playlist-btn {
    opacity: 1;
  }

  .playlist-btn:hover {
    color: var(--accent);
    background: var(--bg-primary);
  }

  .playlist-btn:has(.lucide-list-check) {
    color: var(--accent);
    opacity: 1;
  }

  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    cursor: pointer;
    opacity: 0;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
    flex-shrink: 0;
  }

  .result-item:hover .play-btn,
  .result-item:focus-within .play-btn {
    opacity: 1;
  }

  .play-btn:hover {
    transform: scale(1.1);
  }

  .load-more-container {
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
  }

  .load-more-btn:hover:not(:disabled) {
    background: var(--bg-card);
    border-color: var(--accent);
  }

  .load-more-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    color: var(--text-secondary);
    text-align: center;
  }

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h3 {
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: var(--text-sm);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    gap: 16px;
    color: var(--text-secondary);
  }
</style>
