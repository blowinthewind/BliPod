<script setup lang="ts">
  import {
    Loader2,
    Play,
    ArrowLeft,
    User,
    Heart,
    ListPlus,
    ListCheck,
    ListMusic,
    Check
  } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
  import { ref, onMounted, onUnmounted, computed, watch, toRaw } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { usePlayerStore } from '../stores/player'
  import { useFavoritesStore } from '../stores/favorites'
  import { usePlaylistsStore } from '../stores/playlists'
  import AddToPlaylistDialog from '../components/Playlist/AddToPlaylistDialog.vue'

  const router = useRouter()
  const route = useRoute()
  const playerStore = usePlayerStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()

  const videos = ref<ExtractedVideo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploaderInfo = ref<UploaderInfo | null>(null)
  const hasMore = ref(false)
  const isLoadingMore = ref(false)
  const currentPage = ref(1)
  const showPlaylistDialog = ref(false)
  const selectedVideo = ref<ExtractedVideo | null>(null)

  const mid = computed(() => route.params.mid as string)
  const hasResults = computed(() => videos.value.length > 0)

  let unsubscribe: (() => void) | null = null
  let playerUnsubscribe: (() => void) | null = null
  let progressUnsubscribe: (() => void) | null = null

  onMounted(() => {
    loadUploaderVideos()
    setupListeners()
    favoritesStore.loadFavorites()
    playlistsStore.loadPlaylists()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
    if (playerUnsubscribe) {
      playerUnsubscribe()
    }
    if (progressUnsubscribe) {
      progressUnsubscribe()
    }
  })

  watch(mid, () => {
    if (mid.value) {
      loadUploaderVideos()
    }
  })

  function setupListeners() {
    unsubscribe = window.electronAPI.search.onSearchResult((result: SearchResult) => {
      if (result.success) {
        if (isLoadingMore.value) {
          const newVideos = result.videos.filter(
            (v: ExtractedVideo) => !videos.value.find((r) => r.bvid === v.bvid)
          )
          videos.value = [...videos.value, ...newVideos]
        } else {
          videos.value = result.videos
          currentPage.value = 1
        }

        if (result.uploader && !uploaderInfo.value) {
          uploaderInfo.value = result.uploader
        }

        currentPage.value = result.currentPage
        hasMore.value = result.videos.length >= 20
      } else {
        error.value = result.error || 'Failed to load videos'
      }
      isLoading.value = false
      isLoadingMore.value = false
    })

    playerUnsubscribe = playerStore.setReadyListener()
    progressUnsubscribe = playerStore.setProgressListener()
  }

  async function loadUploaderVideos() {
    if (!mid.value) return

    isLoading.value = true
    error.value = null
    videos.value = []
    currentPage.value = 1
    uploaderInfo.value = null

    try {
      const result = await window.electronAPI.search.loadUploaderVideos(mid.value)

      if (result.success) {
        videos.value = result.videos
        if (result.uploader) {
          uploaderInfo.value = result.uploader
        } else if (result.videos.length > 0) {
          uploaderInfo.value = {
            name: result.videos[0].author,
            avatar: '',
            mid: mid.value
          }
        }
        hasMore.value = result.videos.length >= 20
      } else {
        error.value = result.error || 'Failed to load videos'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  async function handleLoadMore() {
    if (isLoadingMore.value || !hasMore.value) return

    isLoadingMore.value = true
    window.electronAPI.search.clickNextPage()
  }

  function handlePlay(bvid: string) {
    const video = videos.value.find((v) => v.bvid === bvid)
    if (video) {
      playerStore.playVideo(video, videos.value, 'uploader')
    }
  }

  function goBack() {
    router.back()
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
    await playerStore.addToUserQueue(video)
  }

  function isInQueue(bvid: string): boolean {
    return playerStore.userQueue.some((v) => v.bvid === bvid)
  }
</script>

<template>
  <div class="uploader-view">
    <div class="uploader-header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" />
      </button>
      <div class="uploader-info">
        <div class="uploader-avatar">
          <LazyImage
            v-if="uploaderInfo?.avatar"
            :src="uploaderInfo.avatar"
            :alt="uploaderInfo.name || 'Avatar'"
            :width="96"
            aspect-ratio="1/1"
            placeholder-icon="image"
          />
          <User v-else :size="24" class="uploader-icon" />
        </div>
        <div class="uploader-text">
          <h1 class="uploader-name">{{ uploaderInfo?.name || '正在加载...' }}</h1>
          <p class="uploader-id">MID: {{ mid }}</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <span>{{ error }}</span>
    </div>

    <div class="videos-container" v-if="hasResults">
      <div class="results-header">
        <span class="results-count">共 {{ videos.length }} 个视频</span>
        <span v-if="currentPage > 1" class="page-info">第 {{ currentPage }} 页</span>
      </div>

      <div class="videos-list">
        <div v-for="video in videos" :key="video.bvid" class="video-item">
          <button
            class="video-item-main"
            type="button"
            :aria-label="`播放 UP 主视频 ${video.title}`"
            @click="handlePlay(video.bvid)"
          >
            <div class="video-cover">
              <LazyImage
                v-if="video.cover"
                :src="video.cover"
                :alt="video.title"
                :width="320"
                aspect-ratio="16/9"
                placeholder-icon="play"
              />
              <div v-else class="cover-placeholder">
                <Play :size="24" />
              </div>
              <div class="video-cover-overlay">
                <span class="play-btn-overlay" aria-hidden="true">
                  <Play :size="18" />
                </span>
              </div>
              <span v-if="video.duration" class="duration-badge">{{ video.duration }}</span>
            </div>
            <div class="video-info">
              <h3 class="video-title" :title="video.title">{{ video.title }}</h3>
              <div class="video-meta">
                <span v-if="video.playCount" class="meta-item">播放 {{ video.playCount }}</span>
              </div>
            </div>
          </button>
          <button
            class="favorite-btn"
            type="button"
            @click.stop="toggleFavorite(video, $event)"
            :aria-label="
              isFavorite(video.bvid) ? `从收藏中移除 ${video.title}` : `收藏 ${video.title}`
            "
          >
            <Heart :size="16" :fill="isFavorite(video.bvid) ? 'currentColor' : 'none'" />
          </button>
          <button
            class="queue-btn"
            type="button"
            @click.stop="addToQueue(video, $event)"
            :aria-label="
              isInQueue(video.bvid)
                ? `${video.title} 已在播放队列中`
                : `将 ${video.title} 添加到播放队列`
            "
          >
            <Check v-if="isInQueue(video.bvid)" :size="16" />
            <ListMusic v-else :size="16" />
          </button>
          <button
            class="playlist-btn"
            type="button"
            @click.stop="openPlaylistDialog(video, $event)"
            :aria-label="
              playlistsStore.isVideoInAnyPlaylist(video.bvid)
                ? `${video.title} 已添加到播放列表`
                : `将 ${video.title} 添加到播放列表`
            "
          >
            <ListCheck v-if="playlistsStore.isVideoInAnyPlaylist(video.bvid)" :size="16" />
            <ListPlus v-else :size="16" />
          </button>
          <button
            class="play-btn"
            type="button"
            :aria-label="`播放 ${video.title}`"
            @click.stop="handlePlay(video.bvid)"
          >
            <Play :size="18" />
          </button>
        </div>
      </div>

      <div v-if="hasMore" class="load-more-container">
        <button class="load-more-btn" @click="handleLoadMore" :disabled="isLoadingMore">
          <Loader2 v-if="isLoadingMore" :size="18" class="animate-spin" />
          <template v-else>
            <span>加载更多</span>
          </template>
        </button>
      </div>
    </div>

    <div class="empty-state" v-else-if="!isLoading && !error">
      <User :size="48" class="empty-icon" />
      <h3>暂无视频</h3>
      <p>这个 UP 主还没有可播放的视频内容</p>
    </div>

    <div class="loading-state" v-if="isLoading">
      <Loader2 :size="32" class="animate-spin" />
      <span>正在加载视频...</span>
    </div>

    <AddToPlaylistDialog
      :visible="showPlaylistDialog"
      :video="selectedVideo"
      @close="closePlaylistDialog"
    />

    <ScrollToButtons
      v-if="hasResults && videos.length > 5"
      scroll-container=".content-area"
      :threshold="5"
    />
  </div>
</template>

<style scoped>
  .uploader-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: min(900px, 100%);
  }

  .uploader-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .back-btn:hover {
    background: var(--bg-card);
  }

  .uploader-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .uploader-avatar {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--bg-card);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .uploader-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .uploader-icon {
    color: var(--accent);
  }

  .uploader-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .uploader-name {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .uploader-id {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: color-mix(in srgb, var(--error) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--error) 32%, transparent);
    border-radius: 8px;
    color: var(--error);
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .videos-container {
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

  .videos-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .video-item {
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

  .video-item:hover,
  .video-item:focus-within {
    background: var(--bg-card);
    border-color: var(--border);
  }

  .video-item-main {
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

  .video-cover {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .video-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .video-item:hover .video-cover img,
  .video-item:focus-within .video-cover img {
    transform: scale(1.05);
  }

  .video-cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .video-item:hover .video-cover-overlay,
  .video-item:focus-within .video-cover-overlay {
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
    background: var(--bg-overlay);
    border-radius: 4px;
    font-size: var(--text-xs);
    color: white;
  }

  .video-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .video-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .video-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.4;
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
      transform 0.2s,
      opacity 0.2s;
    flex-shrink: 0;
  }

  .video-item:hover .play-btn,
  .video-item:focus-within .play-btn {
    opacity: 1;
  }

  .play-btn:hover {
    transform: scale(1.1);
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
      transform 0.2s,
      opacity 0.2s;
    flex-shrink: 0;
  }

  .video-item:hover .favorite-btn,
  .video-item:focus-within .favorite-btn {
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
      transform 0.2s,
      opacity 0.2s;
    flex-shrink: 0;
  }

  .video-item:hover .queue-btn,
  .video-item:focus-within .queue-btn {
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
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
    flex-shrink: 0;
  }

  .video-item:hover .playlist-btn,
  .video-item:focus-within .playlist-btn {
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

  .playlist-btn:has(.lucide-list-check) {
    color: var(--accent);
    opacity: 1;
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
      color 0.2s,
      border-color 0.2s,
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

  @media (max-width: 768px) {
    .uploader-header {
      align-items: flex-start;
    }

    .uploader-info {
      min-width: 0;
    }

    .video-cover {
      width: clamp(104px, 24vw, 120px);
      height: auto;
      aspect-ratio: 16 / 9;
    }
  }

  @media (max-width: 640px) {
    .uploader-header {
      gap: 12px;
    }

    .uploader-text {
      min-width: 0;
    }

    .uploader-name {
      font-size: var(--text-xl);
    }

    .results-header {
      align-items: flex-start;
      gap: 8px;
      flex-direction: column;
    }

    .video-item {
      align-items: flex-start;
      gap: 10px;
    }

    .video-item-main {
      gap: 12px;
      align-items: flex-start;
    }

    .video-meta {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 520px) {
    .video-item {
      padding: 10px;
    }

    .video-cover {
      width: 96px;
    }

    .play-btn,
    .favorite-btn,
    .queue-btn,
    .playlist-btn {
      opacity: 1;
    }
  }
</style>
