<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Heart, Play, Trash2 } from 'lucide-vue-next'
import LazyImage from '../components/ui/LazyImage.vue'
import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
import { useFavoritesStore } from '../stores/favorites'
import { usePlayerStore } from '../stores/player'
import type { FavoriteVideo } from '../../preload/preload'

const favoritesStore = useFavoritesStore()
const playerStore = usePlayerStore()

const isLoading = computed(() => favoritesStore.isLoading)
const favorites = computed(() => favoritesStore.favorites)

onMounted(() => {
  favoritesStore.loadFavorites()
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function playVideo(video: FavoriteVideo) {
  playerStore.playVideo(video, favorites.value, 'favorite')
}

async function removeFavorite(bvid: string) {
  await favoritesStore.removeFavorite(bvid)
}
</script>

<template>
  <div class="favorites-view">
    <div class="page-header">
      <div class="header-icon">
        <Heart :size="24" />
      </div>
      <div class="header-text">
        <h1 class="page-title">我的收藏</h1>
        <p class="page-desc">{{ favorites.length }} 个收藏</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <span>加载中...</span>
    </div>

    <div class="favorites-list" v-else-if="favorites.length > 0">
      <div
        v-for="item in favorites"
        :key="item.bvid"
        class="favorite-item"
        @click="playVideo(item)"
      >
        <div class="item-cover">
          <LazyImage
            v-if="item.cover"
            :src="item.cover"
            :alt="item.title"
            :width="320"
            aspect-ratio="16/9"
            placeholder-icon="play"
          />
          <div v-else class="cover-placeholder">🎵</div>
          <span class="item-duration">{{ item.duration }}</span>
        </div>
        <div class="item-info">
          <h3 class="item-title">{{ item.title }}</h3>
          <div class="item-meta">
            <span class="meta-author">{{ item.author }}</span>
            <span class="meta-date">收藏于 {{ formatDate(item.addedAt) }}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="action-btn play" title="播放" @click.stop="playVideo(item)">
            <Play :size="18" />
          </button>
          <button class="action-btn remove" title="移除" @click.stop="removeFavorite(item.bvid)">
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <Heart :size="48" class="empty-icon" />
      <h3>暂无收藏</h3>
      <p>搜索并收藏你喜欢的视频</p>
    </div>

    <ScrollToButtons
      scroll-container=".content-area"
      :threshold="5"
    />
  </div>
</template>

<style scoped>
.favorites-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), #ff8a80);
  color: white;
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

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  color: var(--text-secondary);
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.favorite-item:hover {
  background: var(--bg-card);
}

.item-cover {
  position: relative;
  width: 100px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
  flex-shrink: 0;
}

.item-cover img {
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
  font-size: 24px;
}

.item-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  font-size: 11px;
  color: white;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
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
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.action-btn.play:hover {
  color: var(--accent);
}

.action-btn.remove:hover {
  color: #ff5252;
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
</style>
