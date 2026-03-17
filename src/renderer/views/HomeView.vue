<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, Clock, TrendingUp, Search, Heart, History, ListMusic } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore } from '../stores/player'
import { useFavoritesStore } from '../stores/favorites'
import { usePlaylistsStore } from '../stores/playlists'
import { useNavigationStore, type NavItem } from '../stores/navigation'

const router = useRouter()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const favoritesStore = useFavoritesStore()
const playlistsStore = usePlaylistsStore()
const navStore = useNavigationStore()

const recentPlays = ref([
  { id: 1, title: 'Sample Video 1', author: 'UP Owner 1', duration: '10:30' },
  { id: 2, title: 'Sample Video 2', author: 'UP Owner 2', duration: '15:45' },
  { id: 3, title: 'Sample Video 3', author: 'UP Owner 3', duration: '8:20' }
])

const recommendations = ref([
  { id: 1, title: 'Recommended Video 1', author: 'UP Owner A', views: '100K' },
  { id: 2, title: 'Recommended Video 2', author: 'UP Owner B', views: '50K' },
  { id: 3, title: 'Recommended Video 3', author: 'UP Owner C', views: '200K' },
  { id: 4, title: 'Recommended Video 4', author: 'UP Owner D', views: '80K' }
])

const userName = computed(() => authStore.userName)
const favorites = computed(() => favoritesStore.favorites.slice(0, 4))
const history = computed(() => playerStore.playHistory)
const playlistsCount = computed(() => playlistsStore.playlistsCount)

onMounted(() => {
  favoritesStore.loadFavorites()
  playlistsStore.loadPlaylists()
})

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
  router.push('/search')
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
      <div class="quick-search" @click="goToSearch">
        <Search :size="20" class="search-icon" />
        <span class="search-placeholder">搜索视频、UP主...</span>
      </div>
    </section>

    <section class="shortcuts-section">
      <div class="shortcut-card" @click="goToFavorites">
        <div class="shortcut-icon favorites">
          <Heart :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">我的收藏</span>
          <span class="shortcut-count">{{ favorites.length }} 个视频</span>
        </div>
      </div>
      <div class="shortcut-card" @click="goToHistory">
        <div class="shortcut-icon history">
          <History :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">播放历史</span>
          <span class="shortcut-count">{{ history.length }} 个视频</span>
        </div>
      </div>
      <div class="shortcut-card" @click="goToPlaylists">
        <div class="shortcut-icon playlist">
          <ListMusic :size="24" />
        </div>
        <div class="shortcut-info">
          <span class="shortcut-title">播放列表</span>
          <span class="shortcut-count">{{ playlistsCount }} 个列表</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <Clock :size="20" />
          Recently Played
        </h2>
      </div>
      <div class="video-grid" v-if="recentPlays.length > 0">
        <div
          v-for="video in recentPlays"
          :key="video.id"
          class="video-card"
        >
          <div class="video-cover">
            <div class="cover-placeholder">
              <Play :size="32" />
            </div>
            <div class="video-cover-overlay">
              <button class="play-btn-overlay">
                <Play :size="24" />
              </button>
            </div>
            <span class="video-duration">{{ video.duration }}</span>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <span class="video-author">{{ video.author }}</span>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>No recent plays</p>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <TrendingUp :size="20" />
          Trending
        </h2>
      </div>
      <div class="video-grid">
        <div
          v-for="video in recommendations"
          :key="video.id"
          class="video-card"
        >
          <div class="video-cover">
            <div class="cover-placeholder">
              <Play :size="32" />
            </div>
            <div class="video-cover-overlay">
              <button class="play-btn-overlay">
                <Play :size="24" />
              </button>
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <span class="video-author">{{ video.author }}</span>
            <span class="video-views">{{ video.views }} views</span>
          </div>
        </div>
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
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.welcome-title .accent {
  color: var(--accent);
}

.welcome-subtitle {
  font-size: 16px;
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
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.quick-search:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-placeholder {
  color: var(--text-secondary);
  font-size: 15px;
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
  transition: all 0.2s ease;
}

.shortcut-card:hover {
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
  background: linear-gradient(135deg, var(--accent), #ff8a80);
}

.shortcut-icon.history {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

.shortcut-icon.playlist {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.shortcut-count {
  font-size: 13px;
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

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.video-card:hover {
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
.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.video-card:hover .cover-placeholder {
  color: var(--accent);
}

.video-card:hover .video-cover img,
.video-card:hover .cover-placeholder {
  transform: scale(1.05);
}

.video-cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-card:hover .video-cover-overlay {
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

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  font-size: 12px;
  color: white;
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.video-views {
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .shortcuts-section {
    grid-template-columns: 1fr;
  }

  .video-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }

  .welcome-title {
    font-size: 24px;
  }
}
</style>
