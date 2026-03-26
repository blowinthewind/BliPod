<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { History, Play, Trash2, Clock } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import Button from '../components/ui/Button.vue'
  import EmptyState from '../components/ui/EmptyState.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
  import { useDialogFocusTrap } from '../composables/useDialogFocusTrap'
  import { usePlayerStore } from '../stores/player'
  import type { HistoryVideo } from '../stores/player'

  const playerStore = usePlayerStore()

  const history = computed(() => playerStore.playHistory)

  const showClearConfirm = ref(false)
  const clearBtnRef = ref<HTMLButtonElement | null>(null)
  const clearDialogRef = ref<HTMLDivElement | null>(null)
  const cancelClearBtnRef = ref<HTMLButtonElement | null>(null)

  const { handleKeydown: handleClearDialogKeydown } = useDialogFocusTrap({
    open: showClearConfirm,
    containerRef: clearDialogRef,
    initialFocusRef: cancelClearBtnRef,
    restoreFocusRef: clearBtnRef,
    onClose: cancelClearHistory
  })

  function cancelClearHistory() {
    showClearConfirm.value = false
  }

  function confirmClearHistory() {
    playerStore.clearHistory()
    showClearConfirm.value = false
  }

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
    showClearConfirm.value = true
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
      <Button v-if="history.length > 0" ref="clearBtnRef" variant="secondary" @click="clearAllHistory">
        <Trash2 :size="16" />
        清空历史
      </Button>
    </div>

    <div class="history-list" v-if="history.length > 0">
      <div v-for="(item, index) in history" :key="item.bvid" class="history-item">
        <span class="item-index">{{ index + 1 }}</span>
        <button
          class="history-item-main"
          type="button"
          :aria-label="`播放历史视频 ${item.title}`"
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
            <div class="cover-overlay">
              <span class="play-btn-overlay" aria-hidden="true">
                <Play :size="18" />
              </span>
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
        </button>
        <div class="item-actions">
          <button
            class="action-btn remove"
            type="button"
            :aria-label="`从播放历史中移除 ${item.title}`"
            @click.stop="removeFromHistory(item.bvid, $event)"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      :icon="History"
      title="暂无播放历史"
      description="开始收听视频，历史记录将显示在这里"
    />

    <ScrollToButtons v-if="history.length > 5" scroll-container=".content-area" :threshold="5" />

    <div class="clear-confirm-overlay" v-if="showClearConfirm" @click.self="cancelClearHistory">
      <div
        ref="clearDialogRef"
        class="clear-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-history-title"
        aria-describedby="clear-history-description"
        @keydown="handleClearDialogKeydown"
      >
        <p id="clear-history-title" class="confirm-text">清空历史</p>
        <p id="clear-history-description" class="confirm-description">
          确定要清空所有播放历史吗？此操作不可撤销。
        </p>
        <div class="confirm-actions">
          <Button ref="cancelClearBtnRef" variant="secondary" @click="cancelClearHistory">取消</Button>
          <Button variant="destructive" @click="confirmClearHistory">清空</Button>
        </div>
      </div>
    </div>
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
    background: var(--accent);
    color: var(--text-on-accent);
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
    transition:
      background-color 0.2s,
      border-color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .history-item:hover,
  .history-item:focus-within {
    background: var(--bg-card);
    border-color: var(--border);
  }

  .history-item-main {
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

  .history-item:hover .item-cover img,
  .history-item:focus-within .item-cover img {
    transform: scale(1.05);
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .history-item:hover .cover-overlay,
  .history-item:focus-within .cover-overlay {
    opacity: 1;
  }

  .play-btn-overlay {
    width: 32px;
    height: 32px;
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
    font-size: var(--text-2xl);
  }

  .item-duration {
    position: absolute;
    bottom: 4px;
    right: 4px;
    padding: 2px 6px;
    background: var(--bg-overlay);
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
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
  }

  .action-btn:hover {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .action-btn.remove:hover {
    color: var(--error);
  }

  .clear-confirm-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    z-index: 1000;
  }

  .clear-confirm-dialog {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(320px, calc(100% - 32px));
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .confirm-text {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
  }

  .confirm-description {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  :deep(.confirm-actions .button-base) {
    flex: 1;
  }
</style>
