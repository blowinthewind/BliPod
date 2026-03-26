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
  import Button from '../components/ui/Button.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
  import EmptyState from '../components/ui/EmptyState.vue'
  import { ref, onMounted, computed, watch, toRaw } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useRouter, useRoute } from 'vue-router'
  import { usePlayerStore } from '../stores/player'
  import { useFavoritesStore } from '../stores/favorites'
  import { usePlaylistsStore } from '../stores/playlists'
  import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
  import AddToPlaylistDialog from '../components/Playlist/AddToPlaylistDialog.vue'

  const router = useRouter()
  const route = useRoute()
  const playerStore = usePlayerStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const { favoriteBvidSet } = storeToRefs(favoritesStore)
  const { allPlaylistBvids } = storeToRefs(playlistsStore)
  const { userQueueBvidSet } = storeToRefs(playerStore)

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

  onMounted(() => {
    loadUploaderVideos()
    favoritesStore.loadFavorites()
    playlistsStore.loadPlaylists()
  })

  watch(mid, () => {
    if (mid.value) {
      loadUploaderVideos()
    }
  })

  async function loadUploaderVideos(page = 1) {
    if (!mid.value) return

    if (page > 1) {
      isLoadingMore.value = true
    } else {
      isLoading.value = true
      videos.value = []
      currentPage.value = 1
      uploaderInfo.value = null
    }

    error.value = null

    try {
      const result = await window.electronAPI.search.loadUploaderVideos(mid.value, page)

      if (result.success) {
        if (page > 1) {
          const newVideos = result.videos.filter(
            (v: ExtractedVideo) => !videos.value.find((r) => r.bvid === v.bvid)
          )
          videos.value = [...videos.value, ...newVideos]
        } else {
          videos.value = result.videos
        }

        if (result.uploader) {
          uploaderInfo.value = result.uploader
        } else if (result.videos.length > 0 && !uploaderInfo.value) {
          uploaderInfo.value = {
            name: result.videos[0].author,
            avatar: '',
            mid: mid.value
          }
        }

        currentPage.value = result.currentPage
        hasMore.value = result.hasMore
      } else {
        error.value = getUserFriendlyErrorMessage(result.error, '当前无法获取该 UP 主的相关内容，请稍候再试')
      }
    } catch (e) {
      error.value = getUserFriendlyErrorMessage(e, '当前无法获取该 UP 主的相关内容，请稍候再试')
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function handleLoadMore() {
    if (isLoadingMore.value || !hasMore.value) return

    await loadUploaderVideos(currentPage.value + 1)
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

  const videoRows = computed(() => {
    return videos.value.map((video) => ({
      video,
      state: {
        isFavorite: favoriteBvidSet.value.has(video.bvid),
        isInQueue: userQueueBvidSet.value.has(video.bvid),
        isInPlaylist: allPlaylistBvids.value.has(video.bvid)
      }
    }))
  })

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
        <div v-for="{ video, state } in videoRows" :key="video.bvid" class="video-item">
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
              state.isFavorite ? `从收藏中移除 ${video.title}` : `收藏 ${video.title}`
            "
          >
            <Heart :size="16" :fill="state.isFavorite ? 'currentColor' : 'none'" />
          </button>
          <button
            class="queue-btn"
            type="button"
            @click.stop="addToQueue(video, $event)"
            :aria-label="
              state.isInQueue
                ? `${video.title} 已在播放队列中`
                : `将 ${video.title} 添加到播放队列`
            "
          >
            <Check v-if="state.isInQueue" :size="16" />
            <ListMusic v-else :size="16" />
          </button>
          <button
            class="playlist-btn"
            type="button"
            @click.stop="openPlaylistDialog(video, $event)"
            :aria-label="
              state.isInPlaylist
                ? `${video.title} 已添加到播放列表`
                : `将 ${video.title} 添加到播放列表`
            "
          >
            <ListCheck v-if="state.isInPlaylist" :size="16" />
            <ListPlus v-else :size="16" />
          </button>
        </div>
      </div>

      <div v-if="hasMore" class="load-more-container">
        <Button class="load-more-btn" variant="secondary" :loading="isLoadingMore" @click="handleLoadMore">
          加载更多
        </Button>
      </div>
    </div>

    <EmptyState
      v-else-if="!isLoading && !error"
      :icon="User"
      title="暂无视频"
      description="这个 UP 主还没有可播放的视频内容"
    />

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
    color: var(--text-secondary-strong, var(--text-secondary));
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
    color: var(--text-on-accent);
    border: none;
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .play-btn-overlay:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-md);
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
    background: var(--accent-muted);
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
    background: var(--accent-muted);
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
    padding-inline: 24px;
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

    .favorite-btn,
    .queue-btn,
    .playlist-btn {
      opacity: 1;
    }
  }
</style>
