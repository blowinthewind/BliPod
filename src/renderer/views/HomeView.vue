<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Play, Search, Heart, History, ListMusic } from 'lucide-vue-next'
  import { useAuthStore } from '../stores/auth'
  import { usePlayerStore } from '../stores/player'
  import { useFavoritesStore } from '../stores/favorites'
  import { usePlaylistsStore } from '../stores/playlists'
  import { useNavigationStore } from '../stores/navigation'
  import LazyImage from '../components/ui/LazyImage.vue'
  import type { HistoryVideo } from '../stores/player'
  import { formatDuration } from '../utils/format'

  const CONTINUE_CONFIG = {
    MIN_PROGRESS: 0.02,
    MAX_PROGRESS: 0.95,
    MAX_VIDEOS: 4,
    FETCH_EXTRA: 2
  } as const

  const router = useRouter()
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const navStore = useNavigationStore()

  interface ContinueVideo extends HistoryVideo {
    progressPercent: number
    currentTimeFormatted: string
  }

  const continueVideos = ref<ContinueVideo[]>([])
  const isLoadingContinue = ref(false)

  const userName = computed(() => authStore.userName)
  const favoritesCount = computed(() => favoritesStore.favorites.length)
  const recentFavorites = computed(() =>
    [...favoritesStore.favorites].sort((a, b) => b.addedAt - a.addedAt).slice(0, 4)
  )
  const history = computed(() => playerStore.playHistory)
  const playlistsCount = computed(() => playlistsStore.playlistsCount)

  onMounted(async () => {
    favoritesStore.loadFavorites()
    playlistsStore.loadPlaylists()
    await loadContinueVideos()
  })

  async function loadContinueVideos() {
    const fetchCount = CONTINUE_CONFIG.MAX_VIDEOS + CONTINUE_CONFIG.FETCH_EXTRA
    const historyVideos = playerStore.playHistory.slice(0, fetchCount)
    if (historyVideos.length === 0) return

    isLoadingContinue.value = true
    const videos: ContinueVideo[] = []
    const currentVideo = playerStore.currentVideo

    for (const video of historyVideos) {
      if (videos.length >= CONTINUE_CONFIG.MAX_VIDEOS) break
      if (currentVideo && video.bvid === currentVideo.bvid) continue

      try {
        const position = await window.electronAPI.store.getPlayPosition(video.bvid)
        if (position && position.currentTime > 0 && position.duration > 0) {
          const progressPercent = position.currentTime / position.duration
          if (
            progressPercent < CONTINUE_CONFIG.MAX_PROGRESS &&
            progressPercent > CONTINUE_CONFIG.MIN_PROGRESS
          ) {
            const durationFormatted = video.duration || formatDuration(position.duration)
            videos.push({
              ...video,
              duration: durationFormatted,
              progressPercent,
              currentTimeFormatted: formatDuration(position.currentTime)
            })
          }
        }
      } catch (e) {
        console.warn('Failed to get play position:', e)
      }
    }

    continueVideos.value = videos
    isLoadingContinue.value = false
  }

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 6) return '夜深了'
    if (hour < 12) return '早上好'
    if (hour < 14) return '中午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  function goToSearch() {
    navStore.setActiveItem('search')
    router.push('/search?focus=true')
  }

  function goToFavorites() {
    navStore.setActiveItem('favorites')
    router.push('/favorites')
  }

  function goToHistory() {
    navStore.setActiveItem('history')
    router.push('/history')
  }

  function goToPlaylists() {
    navStore.setActiveItem('playlists')
    router.push('/playlists')
  }

  function playContinueVideo(video: HistoryVideo) {
    playerStore.playVideo(video, undefined, 'history')
  }

  function playFavoriteVideo(video: (typeof recentFavorites.value)[0]) {
    playerStore.playVideo(video, favoritesStore.favorites, 'favorite')
  }
</script>

<template>
  <div class="home-view">
    <section class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">
          {{ getGreeting() }}，<span class="accent">{{ userName }}</span>
        </h1>
        <p class="welcome-subtitle">今天想听点什么？</p>
      </div>
      <button class="quick-search" type="button" aria-label="搜索视频和 UP 主" @click="goToSearch">
        <Search :size="20" class="search-icon" />
        <span class="search-placeholder">搜索视频、UP主...</span>
      </button>
    </section>

    <section class="shortcuts-section">
      <button class="shortcut-card" type="button" aria-label="打开我的收藏" @click="goToFavorites">
        <div class="shortcut-icon favorites">
          <Heart :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">我的收藏</span>
          <span class="shortcut-count">{{ favoritesCount }} 个视频</span>
        </div>
      </button>
      <button class="shortcut-card" type="button" aria-label="打开播放列表" @click="goToPlaylists">
        <div class="shortcut-icon playlist">
          <ListMusic :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">播放列表</span>
          <span class="shortcut-count">{{ playlistsCount }} 个列表</span>
        </div>
      </button>
      <button class="shortcut-card" type="button" aria-label="打开播放历史" @click="goToHistory">
        <div class="shortcut-icon history">
          <History :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">播放历史</span>
          <span class="shortcut-count">{{ history.length }} 个视频</span>
        </div>
      </button>
    </section>

    <section class="section" v-if="continueVideos.length > 0">
      <div class="section-header">
        <h2 class="section-title">
          <Play :size="20" />
          继续收听
        </h2>
      </div>
      <div class="continue-grid">
        <button
          v-for="video in continueVideos"
          :key="video.bvid"
          class="continue-card"
          type="button"
          :aria-label="`继续播放 ${video.title}`"
          @click="playContinueVideo(video)"
        >
          <div class="continue-cover">
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
            <div class="continue-overlay">
              <span class="continue-play-btn" aria-hidden="true">
                <Play :size="20" />
              </span>
            </div>
            <div class="continue-progress">
              <div
                class="continue-progress-bar"
                :style="{ width: `${video.progressPercent * 100}%` }"
              ></div>
            </div>
          </div>
          <div class="continue-info">
            <h3 class="continue-title">{{ video.title }}</h3>
            <div class="continue-meta">
              <span class="continue-author">{{ video.author }}</span>
              <span class="continue-time"
                >{{ video.currentTimeFormatted }} / {{ video.duration }}</span
              >
            </div>
          </div>
        </button>
      </div>
    </section>

    <section class="section" v-if="recentFavorites.length > 0">
      <div class="section-header">
        <h2 class="section-title">
          <Heart :size="20" />
          最近收藏
        </h2>
        <button class="see-more-btn" @click="goToFavorites">查看全部</button>
      </div>
      <div class="video-grid">
        <button
          v-for="video in recentFavorites"
          :key="video.bvid"
          class="video-card"
          type="button"
          :aria-label="`播放收藏视频 ${video.title}`"
          @click="playFavoriteVideo(video)"
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
              <Play :size="32" />
            </div>
            <div class="video-cover-overlay">
              <span class="play-btn-overlay" aria-hidden="true">
                <Play :size="24" />
              </span>
            </div>
            <span v-if="video.duration" class="video-duration">{{ video.duration }}</span>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <span class="video-author">{{ video.author }}</span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
  .home-view {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .welcome-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-card));
    border-radius: var(--radius-xl);
  }

  .welcome-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .welcome-title .accent {
    color: var(--accent);
  }

  .welcome-subtitle {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .quick-search {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
    border: 1px solid transparent;
    width: 100%;
    text-align: left;
  }

  .quick-search:hover,
  .quick-search:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
  }

  .search-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .search-placeholder {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .shortcuts-section {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .shortcut-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    border: none;
    width: 100%;
    text-align: left;
  }

  .shortcut-card:hover,
  .shortcut-card:focus-visible {
    background: var(--bg-card);
    transform: translateY(-2px);
  }

  .shortcut-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: white;
    flex-shrink: 0;
  }

  .shortcut-icon.favorites {
    background: linear-gradient(135deg, var(--accent), var(--accent-rose));
  }

  .shortcut-icon.history {
    background: linear-gradient(135deg, var(--accent-sky), var(--accent-violet));
  }

  .shortcut-icon.playlist {
    background: linear-gradient(135deg, var(--accent-violet), var(--accent-lilac));
  }

  .shortcut-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .shortcut-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .shortcut-count {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .see-more-btn {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .see-more-btn:hover {
    background: var(--bg-card);
    color: var(--accent);
    border-color: var(--accent);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .continue-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .continue-card {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    border: none;
    width: 100%;
    text-align: left;
  }

  .continue-card:hover,
  .continue-card:focus-visible,
  .continue-card:focus-within {
    background: var(--bg-card);
    transform: translateY(-2px);
  }

  .continue-cover {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .continue-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .continue-card:hover .continue-cover img,
  .continue-card:focus-visible .continue-cover img,
  .continue-card:focus-within .continue-cover img {
    transform: scale(1.05);
  }

  .cover-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .continue-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .continue-card:hover .continue-overlay,
  .continue-card:focus-visible .continue-overlay,
  .continue-card:focus-within .continue-overlay {
    opacity: 1;
  }

  .continue-play-btn {
    width: 40px;
    height: 40px;
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

  .continue-play-btn:hover {
    transform: scale(1.1);
  }

  .continue-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--bg-overlay);
  }

  .continue-progress-bar {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }

  .continue-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .continue-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .continue-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .continue-time {
    color: var(--accent);
    font-weight: 500;
  }

  .video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }

  .video-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    cursor: pointer;
    transition:
      background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    width: 100%;
    text-align: left;
  }

  .video-card:hover,
  .video-card:focus-visible,
  .video-card:focus-within {
    background: var(--bg-card);
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .video-cover {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
  }

  .video-cover img,
  .video-cover .cover-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .video-cover .cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .video-card:hover .cover-placeholder,
  .video-card:focus-visible .cover-placeholder,
  .video-card:focus-within .cover-placeholder {
    color: var(--accent);
  }

  .video-card:hover .video-cover img,
  .video-card:hover .cover-placeholder,
  .video-card:focus-visible .video-cover img,
  .video-card:focus-visible .cover-placeholder,
  .video-card:focus-within .video-cover img,
  .video-card:focus-within .cover-placeholder {
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

  .video-card:hover .video-cover-overlay,
  .video-card:focus-visible .video-cover-overlay,
  .video-card:focus-within .video-cover-overlay {
    opacity: 1;
  }

  .play-btn-overlay {
    width: 56px;
    height: 56px;
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

  .video-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .video-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .video-author {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  @media (max-width: 768px) {
    .page-header {
      gap: 14px;
    }

    .welcome-section {
      gap: 18px;
    }

    .quick-search {
      padding: 12px 16px;
    }

    .shortcuts-section {
      grid-template-columns: 1fr;
    }

    .shortcut-card {
      padding: 14px;
    }

    .continue-grid {
      grid-template-columns: 1fr;
    }

    .continue-card {
      gap: 10px;
    }

    .continue-cover {
      width: clamp(104px, 28vw, 120px);
      height: auto;
      aspect-ratio: 16 / 9;
    }

    .video-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
      gap: 16px;
    }

    .welcome-title {
      font-size: var(--text-2xl);
    }
  }

  @media (max-width: 560px) {
    .continue-card {
      flex-direction: column;
    }

    .continue-cover {
      width: 100%;
      max-width: none;
    }

    .continue-meta {
      gap: 4px;
    }
  }

  @media (max-width: 420px) {
    .page-header {
      gap: 12px;
    }

    .quick-search {
      padding: 11px 14px;
    }

    .shortcut-card {
      gap: 12px;
      padding: 12px;
    }

    .shortcut-icon {
      width: 44px;
      height: 44px;
    }

    .video-grid {
      grid-template-columns: 1fr;
      max-width: none;
    }
  }
</style>
