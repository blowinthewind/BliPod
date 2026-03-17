<script setup lang="ts">
  import { computed } from 'vue'
  import { History, Play, Trash2, Clock } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
  import { usePlayerStore } from '../stores/player'
  import type { HistoryVideo } from '../stores/player'

  const playerStore = usePlayerStore()

  const history = computed(() => playerStore.playHistory)

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return minutes <= 0 ? '刚刚' : `${minutes} 分钟前`
    }

    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours} 小时前`
    }

    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days} 天前`
    }

    // 默认显示日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  function playVideo(video: HistoryVideo) {
    // 从历史播放时，不传 contextVideos，只播放单个视频 + 用户队列
    playerStore.playVideo(video, undefined, 'history')
  }

  function removeFromHistory(bvid: string, event: Event) {
    event.stopPropagation()
    playerStore.removeFromHistory(bvid)
  }

  function clearAllHistory() {
    if (confirm('确定要清空所有播放历史吗？')) {
      playerStore.clearHistory()
    }
  }
</script>

<template>
  <div class="history-view">
    <div class="page-header">
      <div class="header-icon">
        <History :size="24" />
      </div>
      <div class="header-text">
        <h1 class="page-title">播放历史</h1>
        <p class="page-desc">{{ history.length }} 个视频</p>
      </div>
      <button v-if="history.length > 0" class="clear-btn" @click="clearAllHistory">
        <Trash2 :size="16" />
        清空历史
      </button>
    </div>

    <div class="history-list" v-if="history.length > 0">
      <div
        v-for="(item, index) in history"
        :key="item.bvid"
        class="history-item"
        @click="playVideo(item)"
      >
        <span class="item-index">{{ index + 1 }}</span>
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
          <div class="cover-overlay">
            <button class="play-btn-overlay" @click.stop="playVideo(item)">
              <Play :size="18" />
            </button>
          </div>
          <span class="item-duration">{{ item.duration }}</span>
        </div>
        <div class="item-info">
          <h3 class="item-title">{{ item.title }}</h3>
          <div class="item-meta">
            <span class="meta-author">{{ item.author }}</span>
            <span class="meta-date">
              <Clock :size="12" />
              {{ formatDate(item.playedAt) }}
            </span>
          </div>
        </div>
        <div class="item-actions">
          <button class="action-btn play" title="播放" @click.stop="playVideo(item)">
            <Play :size="18" />
          </button>
          <button
            class="action-btn remove"
            title="移除"
            @click.stop="removeFromHistory(item.bvid, $event)"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <History :size="48" class="empty-icon" />
      <h3>暂无播放历史</h3>
      <p>开始观看视频，历史记录将显示在这里</p>
    </div>

    <ScrollToButtons v-if="history.length > 5" scroll-container=".content-area" :threshold="5" />
  </div>
</template>

<style scoped>
  .history-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    color: white;
  }

  .header-text {
    flex: 1;
  }

  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .page-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.45;
  }

  .clear-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle, transparent);
    cursor: pointer;
    transition: all 0.2s;
  }

  .history-item:hover {
    background: var(--bg-card);
    border-color: var(--border);
  }

  .item-index {
    width: 24px;
    text-align: center;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .item-cover {
    position: relative;
    width: 100px;
    height: 60px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .item-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .history-item:hover .item-cover img {
    transform: scale(1.05);
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .history-item:hover .cover-overlay {
    opacity: 1;
  }

  .play-btn-overlay {
    width: 32px;
    height: 32px;
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
    font-size: var(--text-2xl);
  }

  .item-duration {
    position: absolute;
    bottom: 4px;
    right: 4px;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 4px;
    font-size: var(--text-xs);
    color: white;
  }

  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow: hidden;
  }

  .item-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .meta-date {
    display: flex;
    align-items: center;
    gap: 4px;
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
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: var(--text-sm);
  }
</style>
