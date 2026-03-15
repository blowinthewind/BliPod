<script setup lang="ts">
import { Search, Loader2, Play, AlertCircle, Clock, X, History, ChevronDown, Heart, ListPlus, ListCheck, ListMusic } from 'lucide-vue-next'
import LazyImage from '../components/ui/LazyImage.vue'
import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
import { ref, onMounted, onUnmounted, computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useSearch } from '../composables/useSearch'
import { useFavoritesStore } from '../stores/favorites'
import { usePlaylistsStore } from '../stores/playlists'
import { usePlayerStore } from '../stores/player'
import AddToPlaylistDialog from '../components/Playlist/AddToPlaylistDialog.vue'
import type { ExtractedVideo } from '../../preload/preload'

const router = useRouter()

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

const hasError = computed(() => searchStore.error !== null)
const errorMessage = computed(() => searchStore.error || '')

onMounted(() => {
  setupListeners()
  favoritesStore.loadFavorites()
  playlistsStore.loadPlaylists()
  // 设置 searchView 销毁监听器
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

function addToQueue(video: ExtractedVideo, event: Event) {
  event.stopPropagation()
  const success = playerStore.addToQueue(video)
  if (success) {
    // 可以添加提示
  }
}

function isInQueue(bvid: string): boolean {
  return playerStore.playQueue.some(v => v.bvid === bvid)
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
        <Search :size="20" class="search-icon" />
        <input
          type="text"
          class="search-input"
          placeholder="Enter keywords to search..."
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          @focus="focusInput"
          @blur="blurInput"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
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
          <div
            v-for="item in searchStore.searchHistory"
            :key="item"
            class="history-item"
            @click="handleHistoryClick(item)"
          >
            <Clock :size="14" class="history-icon" />
            <span class="history-text">{{ item }}</span>
            <button class="remove-history-btn" @click="removeHistoryItem(item, $event)">
              <X :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasError" class="error-message" :class="{ 'timeout-error': errorMessage.includes('超时') }">
      <AlertCircle :size="20" />
      <span>{{ errorMessage }}</span>
      <span v-if="isRetrying" class="retry-info">(Retrying... {{ retryCount }}/3)</span>
    </div>

    <div class="search-results" v-if="searchStore.hasResults">
      <div class="results-header">
        <span class="results-count">Found {{ searchStore.resultCount }} results</span>
        <span v-if="searchStore.currentPage > 1" class="page-info">Page {{ searchStore.currentPage }}</span>
      </div>
      
      <div class="results-list">
        <div
          v-for="result in searchStore.results"
          :key="result.bvid"
          class="result-item"
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
            <span v-if="result.duration" class="duration-badge">{{ result.duration }}</span>
          </div>
          <div class="result-info">
            <h3 class="result-title" :title="result.title">{{ result.title }}</h3>
            <div class="result-meta">
              <span 
                class="meta-item author clickable" 
                @click="handleAuthorClick(result.authorLink, $event)"
                :title="`View ${result.author}'s videos`"
              >
                {{ result.author }}
              </span>
              <span class="meta-divider">•</span>
              <span v-if="result.playCount" class="meta-item">{{ result.playCount }} plays</span>
            </div>
          </div>
          <button class="favorite-btn" @click.stop="toggleFavorite(result, $event)" :title="isFavorite(result.bvid) ? 'Remove from favorites' : 'Add to favorites'">
            <Heart :size="16" :fill="isFavorite(result.bvid) ? 'currentColor' : 'none'" />
          </button>
          <button
            class="queue-btn"
            @click.stop="addToQueue(result, $event)"
            :title="isInQueue(result.bvid) ? '已在队列中' : '添加到播放队列'"
          >
            <ListMusic :size="16" />
          </button>
          <button
            class="playlist-btn"
            @click.stop="openPlaylistDialog(result, $event)"
            :title="playlistsStore.isVideoInAnyPlaylist(result.bvid) ? '已添加到播放列表' : '添加到播放列表'"
          >
            <ListCheck v-if="playlistsStore.isVideoInAnyPlaylist(result.bvid)" :size="16" />
            <ListPlus v-else :size="16" />
          </button>
          <button class="play-btn" @click.stop="handlePlay(result.bvid)">
            <Play :size="18" />
          </button>
        </div>
      </div>

      <div v-if="searchStore.hasMore" class="load-more-container">
        <button 
          class="load-more-btn" 
          @click="handleLoadMore"
          :disabled="searchStore.isLoadingMore"
        >
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

.search-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-desc {
  font-size: 14px;
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
  transition: all 0.2s;
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
  font-size: 15px;
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
  transition: all 0.2s;
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
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-history-btn {
  font-size: 12px;
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
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg-card);
}

.history-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.history-text {
  flex: 1;
  font-size: 14px;
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
  transition: all 0.2s;
}

.history-item:hover .remove-history-btn {
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
  font-size: 14px;
  flex-wrap: wrap;
}

.error-message.timeout-error {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.retry-info {
  color: var(--text-secondary);
  font-size: 12px;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.results-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  padding: 4px 8px;
  border-radius: 4px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: var(--bg-card);
}

.result-cover {
  position: relative;
  width: 120px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
  flex-shrink: 0;
}

.result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-size: 11px;
  color: white;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.result-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-item.author {
  color: var(--accent);
}

.meta-item.author.clickable {
  cursor: pointer;
  transition: all 0.2s;
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
  transition: all 0.2s;
  flex-shrink: 0;
}

.result-item:hover .favorite-btn {
  opacity: 1;
}

.favorite-btn:hover {
  color: var(--accent);
}

.favorite-btn:has(svg[fill="currentColor"]) {
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
  transition: all 0.2s;
  flex-shrink: 0;
}

.result-item:hover .queue-btn {
  opacity: 1;
}

.queue-btn:hover {
  color: var(--accent);
  background: var(--bg-primary);
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
  transition: all 0.2s;
  flex-shrink: 0;
}

.result-item:hover .playlist-btn {
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
  transition: all 0.2s;
  flex-shrink: 0;
}

.result-item:hover .play-btn {
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
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
