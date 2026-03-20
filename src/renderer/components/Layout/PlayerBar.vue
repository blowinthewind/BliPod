<script setup lang="ts">
  import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    StepBack,
    StepForward,
    Volume2,
    VolumeX,
    Repeat,
    Shuffle,
    ListCheck,
    ListPlus,
    Maximize2,
    Heart,
    ListMusic,
    X,
    Trash2
  } from 'lucide-vue-next'
  import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
  import { usePlayerStore } from '../../stores/player'
  import { useFavoritesStore } from '../../stores/favorites'
  import { usePlaylistsStore } from '../../stores/playlists'
  import { useAppSettingsStore } from '../../stores/appSettings'
  import AddToPlaylistDialog from '../Playlist/AddToPlaylistDialog.vue'
  import { useDialogFocusTrap } from '../../composables/useDialogFocusTrap'

  const playerStore = usePlayerStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const appSettingsStore = useAppSettingsStore()

  const progress = computed(() => playerStore.progress)
  const formattedCurrentTime = computed(() => formatTime(playerStore.currentTime))
  const formattedDuration = computed(() => formatTime(playerStore.duration))
  const isCurrentFavorite = computed(() => {
    if (!playerStore.currentVideo) return false
    return favoritesStore.isFavoriteSync(playerStore.currentVideo.bvid)
  })
  const queueCount = computed(() => playerStore.userQueue.length)
  const isCurrentInQueue = computed(() => {
    if (!playerStore.currentVideo) return false
    return playerStore.userQueue.some((v) => v.bvid === playerStore.currentVideo?.bvid)
  })

  const showPlaylistDialog = ref(false)
  const showQueuePanel = ref(false)
  const queueToggleButtonRef = ref<HTMLButtonElement | null>(null)
  const queuePanelRef = ref<HTMLDivElement | null>(null)
  const closeQueueButtonRef = ref<HTMLButtonElement | null>(null)

  onMounted(async () => {
    favoritesStore.loadFavorites()
    playlistsStore.loadPlaylists()
    await appSettingsStore.loadSettings()
    playerStore.initVolume()

    if (!playerStore.hasVideo) {
      await playerStore.restoreLastPlayedVideo()
    }
  })

  onBeforeUnmount(async () => {
    await playerStore.saveCurrentPosition()
  })

  function openPlaylistDialog() {
    if (!playerStore.currentVideo) return
    showPlaylistDialog.value = true
  }

  function closePlaylistDialog() {
    showPlaylistDialog.value = false
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function seekTo(event: MouseEvent) {
    if (!playerStore.hasVideo) return
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    playerStore.seekByPercent(percent * 100)
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement
    playerStore.setVolume(parseInt(target.value))
  }

  async function toggleFavorite() {
    if (!playerStore.currentVideo) return
    if (isCurrentFavorite.value) {
      await favoritesStore.removeFavorite(playerStore.currentVideo.bvid)
    } else {
      const rawVideo = toRaw(playerStore.currentVideo)
      await favoritesStore.addFavorite(rawVideo)
    }
  }

  function toggleQueuePanel() {
    showQueuePanel.value = !showQueuePanel.value
  }

  function closeQueuePanel() {
    showQueuePanel.value = false
  }

  const { handleKeydown: handleQueuePanelKeydown } = useDialogFocusTrap({
    open: showQueuePanel,
    containerRef: queuePanelRef,
    initialFocusRef: closeQueueButtonRef,
    restoreFocusRef: queueToggleButtonRef,
    onClose: closeQueuePanel
  })

  function playFromQueue(index: number) {
    playerStore.playFromUserQueue(index)
  }

  async function removeFromQueue(bvid: string, event: Event) {
    event.stopPropagation()
    await playerStore.removeFromUserQueue(bvid)
  }

  async function clearQueue() {
    if (confirm('确定要清空播放队列吗？')) {
      await playerStore.clearUserQueue()
    }
  }

  function handleProgressKeydown(event: KeyboardEvent) {
    if (!playerStore.hasVideo) return

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        playerStore.seekBackward(5)
        break
      case 'ArrowRight':
        event.preventDefault()
        playerStore.seekForward(5)
        break
      case 'Home':
        event.preventDefault()
        playerStore.seekByPercent(0)
        break
      case 'End':
        event.preventDefault()
        playerStore.seekByPercent(100)
        break
      case 'PageDown':
        event.preventDefault()
        playerStore.seekBackward(15)
        break
      case 'PageUp':
        event.preventDefault()
        playerStore.seekForward(15)
        break
    }
  }
</script>

<template>
  <footer class="player-bar">
    <div class="now-playing">
      <button
        class="track-cover"
        type="button"
        @click="playerStore.togglePlay"
        :aria-label="
          playerStore.isPlaying
            ? `暂停 ${playerStore.currentVideo?.title || '当前内容'}`
            : `播放 ${playerStore.currentVideo?.title || '当前内容'}`
        "
        :disabled="!playerStore.hasVideo"
      >
        <img
          v-if="playerStore.currentVideo?.cover"
          :src="playerStore.currentVideo.cover"
          :alt="playerStore.currentVideo.title"
        />
        <div v-else class="cover-placeholder">
          <span v-if="playerStore.isLoading">⏳</span>
          <span v-else>🎵</span>
        </div>
        <div class="track-cover-overlay">
          <span class="mini-play-btn" aria-hidden="true">
            <Play v-if="!playerStore.isPlaying" :size="14" />
            <Pause v-else :size="14" />
          </span>
        </div>
      </button>
      <div class="track-info">
        <span class="track-title" :title="playerStore.currentVideo?.title">
          {{ playerStore.currentVideo?.title || '等待播放' }}
        </span>
        <span class="track-artist">
          {{ playerStore.currentVideo?.author || '选择一个视频开始播放' }}
        </span>
      </div>
      <button
        class="like-btn"
        v-if="playerStore.hasVideo"
        @click="toggleFavorite"
        :aria-label="isCurrentFavorite ? '从收藏中移除' : '添加到收藏'"
        :aria-pressed="isCurrentFavorite"
        :class="{ active: isCurrentFavorite }"
      >
        <Heart :size="18" :fill="isCurrentFavorite ? 'currentColor' : 'none'" />
      </button>
    </div>

    <div class="player-controls">
      <div class="control-buttons">
        <button
          class="control-btn small"
          :class="{ active: playerStore.isShuffle }"
          @click="playerStore.toggleShuffle"
          :aria-label="playerStore.isShuffle ? '关闭随机播放' : '开启随机播放'"
          :aria-pressed="playerStore.isShuffle"
        >
          <Shuffle :size="16" />
        </button>
        <button
          class="control-btn small seek-btn"
          aria-label="后退 15 秒"
          @click="playerStore.seekBackward(15)"
          :disabled="!playerStore.hasVideo"
        >
          <StepBack :size="14" />
          <span class="seek-label">15</span>
        </button>
        <button
          class="control-btn"
          aria-label="上一首"
          @click="playerStore.previous"
          :disabled="!playerStore.hasPrevious"
        >
          <SkipBack :size="20" />
        </button>
        <button
          class="control-btn play-btn"
          @click="playerStore.togglePlay"
          :aria-label="playerStore.isPlaying ? '暂停播放' : '开始播放'"
          :disabled="!playerStore.hasVideo"
        >
          <Loader2 v-if="playerStore.isLoading" :size="22" class="animate-spin" />
          <Play v-else-if="!playerStore.isPlaying" :size="22" />
          <Pause v-else :size="22" />
        </button>
        <button
          class="control-btn"
          aria-label="下一首"
          @click="playerStore.next"
          :disabled="!playerStore.hasNext"
        >
          <SkipForward :size="20" />
        </button>
        <button
          class="control-btn small seek-btn"
          aria-label="前进 30 秒"
          @click="playerStore.seekForward(30)"
          :disabled="!playerStore.hasVideo"
        >
          <StepForward :size="14" />
          <span class="seek-label">30</span>
        </button>
        <button
          class="control-btn small"
          :class="{ active: playerStore.isRepeat }"
          @click="playerStore.toggleRepeat"
          :aria-label="playerStore.isRepeat ? '关闭循环播放' : '开启循环播放'"
          :aria-pressed="playerStore.isRepeat"
        >
          <Repeat :size="16" />
        </button>
      </div>

      <div class="progress-container">
        <span class="time" aria-label="当前时间">{{ formattedCurrentTime }}</span>
        <div
          class="progress-bar"
          :class="{ disabled: !playerStore.hasVideo }"
          @click="seekTo"
          role="slider"
          :aria-label="'播放进度：' + formattedCurrentTime + ' / ' + formattedDuration"
          :aria-valuemin="0"
          :aria-valuemax="playerStore.duration"
          :aria-valuenow="playerStore.currentTime"
          :aria-valuetext="formattedCurrentTime"
          tabindex="0"
          @keydown="handleProgressKeydown"
        >
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress}%` }">
              <div class="progress-thumb"></div>
            </div>
          </div>
        </div>
        <span class="time" aria-label="总时长">{{ formattedDuration || '0:00' }}</span>
      </div>
    </div>

    <div class="extra-controls">
      <button
        ref="queueToggleButtonRef"
        class="control-btn small queue-btn"
        :class="{ active: showQueuePanel || isCurrentInQueue }"
        @click="toggleQueuePanel"
        :aria-label="'播放队列（' + queueCount + ' 首）'"
        :aria-expanded="showQueuePanel"
        aria-controls="player-queue-panel"
      >
        <ListMusic :size="18" />
        <span v-if="queueCount > 0" class="queue-badge">{{ queueCount }}</span>
      </button>
      <button
        class="control-btn small playlist-btn"
        v-if="playerStore.hasVideo"
        @click="openPlaylistDialog"
        :aria-label="
          playlistsStore.isVideoInAnyPlaylist(playerStore.currentVideo!.bvid)
            ? '已添加到播放列表'
            : '添加到播放列表'
        "
      >
        <ListCheck
          v-if="playlistsStore.isVideoInAnyPlaylist(playerStore.currentVideo!.bvid)"
          :size="18"
        />
        <ListPlus v-else :size="18" />
      </button>
      <div class="volume-container">
        <button
          class="control-btn small"
          @click="playerStore.toggleMute"
          :aria-label="playerStore.isMuted ? '取消静音' : '静音'"
        >
          <VolumeX v-if="playerStore.isMuted" :size="18" />
          <Volume2 v-else :size="18" />
        </button>
        <div class="volume-slider">
          <input
            type="range"
            min="0"
            max="100"
            :value="playerStore.isMuted ? 0 : playerStore.volume"
            @input="handleVolumeChange"
            aria-label="音量"
          />
        </div>
      </div>
      <button class="control-btn small" aria-label="全屏">
        <Maximize2 :size="18" />
      </button>
    </div>

    <!-- 播放队列面板 -->
    <div class="queue-panel-overlay" v-if="showQueuePanel" @click.self="closeQueuePanel">
      <div
        id="player-queue-panel"
        ref="queuePanelRef"
        class="queue-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-queue-title"
        @keydown="handleQueuePanelKeydown"
      >
        <div class="queue-header">
          <div id="player-queue-title" class="queue-title">
            <ListMusic :size="18" />
            <span>播放队列</span>
            <span class="queue-count">({{ queueCount }})</span>
          </div>
          <div class="queue-actions">
            <button
              v-if="queueCount > 0"
              class="queue-action-btn"
              type="button"
              @click="clearQueue"
              aria-label="清空播放队列"
            >
              <Trash2 :size="14" />
            </button>
            <button
              ref="closeQueueButtonRef"
              class="queue-action-btn"
              type="button"
              aria-label="关闭播放队列"
              @click="closeQueuePanel"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <div class="queue-list" v-if="queueCount > 0">
          <div
            v-for="(video, index) in playerStore.userQueue"
            :key="video.bvid"
            class="queue-item"
            :class="{ active: playerStore.currentVideo?.bvid === video.bvid }"
          >
            <button
              class="queue-item-main"
              type="button"
              :aria-label="`播放队列中的 ${video.title}`"
              @click="playFromQueue(index)"
            >
              <div class="queue-item-index">
                <span v-if="playerStore.currentVideo?.bvid === video.bvid">▶</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="queue-item-cover">
                <img v-if="video.cover" :src="video.cover" :alt="video.title" />
                <div v-else class="queue-item-placeholder">🎵</div>
              </div>
              <div class="queue-item-info">
                <div class="queue-item-title" :title="video.title">{{ video.title }}</div>
                <div class="queue-item-author">{{ video.author }}</div>
              </div>
            </button>
            <button
              class="queue-item-remove"
              type="button"
              @click.stop="removeFromQueue(video.bvid, $event)"
              :aria-label="`从播放队列移除 ${video.title}`"
            >
              <X :size="14" />
            </button>
          </div>
        </div>

        <div class="queue-empty" v-else>
          <ListMusic :size="32" />
          <p>播放队列为空</p>
          <span>从视频列表中添加视频到队列</span>
        </div>
      </div>
    </div>

    <AddToPlaylistDialog
      :visible="showPlaylistDialog"
      :video="playerStore.currentVideo"
      @close="closePlaylistDialog"
    />
  </footer>
</template>

<script lang="ts">
  import { Loader2 } from 'lucide-vue-next'
  export default {
    components: { Loader2 }
  }
</script>

<style scoped>
  .player-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 90px;
    padding: 0 16px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
  }

  .now-playing {
    display: flex;
    align-items: center;
    gap: 12px;
    width: clamp(220px, 24vw, 280px);
    min-width: 0;
  }

  .track-cover {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
    cursor: pointer;
    padding: 0;
    border: none;
  }

  .track-cover img {
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
    font-size: var(--text-2xl);
  }

  .track-cover-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .track-cover:hover .track-cover-overlay {
    opacity: 1;
  }

  .mini-play-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-primary);
    border: none;
    border-radius: var(--radius-full);
    color: var(--bg-primary);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .mini-play-btn:hover {
    transform: scale(1.1);
  }

  .track-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .track-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-artist {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .like-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color 0.2s,
      background-color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .like-btn:hover {
    color: var(--accent);
  }

  .like-btn.active {
    color: var(--accent);
    animation: heartbeat 0.3s ease;
  }

  @keyframes heartbeat {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.2);
    }
    50% {
      transform: scale(1);
    }
    75% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  .player-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 720px;
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    transition:
      color 0.2s,
      background-color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .control-btn:hover:not(:disabled) {
    color: var(--accent);
  }

  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .control-btn.small {
    width: 32px;
    height: 32px;
    color: var(--text-secondary);
  }

  .control-btn.small:hover:not(:disabled) {
    color: var(--text-primary);
  }

  .control-btn.small.active {
    color: var(--accent);
  }

  .control-btn.small:has(.lucide-list-check) {
    color: var(--accent);
  }

  .control-btn:not(.small) {
    width: 36px;
    height: 36px;
  }

  .play-btn {
    width: 40px !important;
    height: 40px !important;
    background: var(--text-primary) !important;
    color: var(--bg-primary) !important;
  }

  .play-btn:hover:not(:disabled) {
    transform: scale(1.05);
    background: var(--text-primary) !important;
    color: var(--bg-primary) !important;
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

  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .time {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    min-width: 40px;
    text-align: center;
  }

  .progress-bar {
    flex: 1;
    height: 12px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .progress-track {
    width: 100%;
    height: 4px;
    background: var(--bg-card);
    border-radius: 2px;
    position: relative;
    transition: height var(--duration-fast, 150ms)
      var(--ease-out-quart, cubic-bezier(0.25, 1, 0.5, 1));
  }

  .progress-bar:hover .progress-track {
    height: 6px;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    position: relative;
    transition: width 0.1s linear;
  }

  .progress-thumb {
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: var(--text-primary);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .progress-bar:hover .progress-thumb {
    opacity: 1;
  }

  .progress-bar.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .extra-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    width: clamp(180px, 20vw, 240px);
    min-width: 0;
    justify-content: flex-end;
  }

  .volume-container {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .volume-slider {
    width: 100px;
  }

  .volume-slider input[type='range'] {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    background: var(--bg-card);
    border-radius: 2px;
    outline: none;
  }

  .volume-slider input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: var(--text-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .seek-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .seek-btn :deep(svg) {
    position: relative;
  }

  .seek-label {
    position: absolute;
    font-size: 0.45rem;
    font-weight: 600;
    line-height: 1;
    color: inherit;
    bottom: 4px;
    pointer-events: none;
  }

  /* 队列按钮 */
  .queue-btn {
    position: relative;
  }

  .queue-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: var(--accent);
    color: white;
    font-size: var(--text-xs);
    font-weight: 600;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 队列面板 */
  .queue-panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-overlay);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 16px;
    padding-bottom: 106px;
  }

  .queue-panel {
    width: min(360px, calc(100vw - 32px));
    max-width: 100%;
    max-height: min(480px, calc(100vh - 138px));
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .queue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .queue-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .queue-count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-weight: 400;
  }

  .queue-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .queue-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .queue-action-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .queue-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 8px;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      opacity 0.2s;
  }

  .queue-item:hover,
  .queue-item:focus-within {
    background: var(--bg-card);
  }

  .queue-item-main {
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

  .queue-item.active {
    background: rgba(233, 69, 96, 0.1);
  }

  .queue-item-index {
    width: 24px;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .queue-item.active .queue-item-index {
    color: var(--accent);
  }

  .queue-item-cover {
    width: 60px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .queue-item-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .queue-item-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-lg);
  }

  .queue-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .queue-item-title {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .queue-item-author {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .queue-item-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
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

  .queue-item:hover .queue-item-remove,
  .queue-item:focus-within .queue-item-remove {
    opacity: 1;
  }

  .queue-item-remove:hover {
    background: color-mix(in srgb, var(--error) 12%, transparent);
    color: var(--error);
  }

  .queue-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    color: var(--text-secondary);
    text-align: center;
  }

  .queue-empty p {
    margin-top: 12px;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .queue-empty span {
    margin-top: 4px;
    font-size: var(--text-xs);
  }

  @media (max-width: 768px) {
    .player-bar {
      gap: 12px;
      padding: 0 12px;
    }

    .now-playing {
      width: auto;
      flex: 1 1 0;
    }

    .track-info {
      min-width: 0;
    }

    .extra-controls {
      width: auto;
      flex: 0 1 auto;
    }

    .volume-slider {
      width: clamp(72px, 16vw, 100px);
    }

    .queue-panel-overlay {
      padding: 0;
      padding-bottom: 90px;
      align-items: flex-end;
      justify-content: center;
    }

    .queue-panel {
      width: calc(100% - 32px);
      max-height: 60vh;
      margin: 0 16px;
    }
  }

  @media (max-width: 640px) {
    .player-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto auto;
      align-items: center;
      height: auto;
      min-height: 90px;
      padding: 10px 12px 12px;
    }

    .now-playing {
      grid-column: 1;
      grid-row: 1;
    }

    .extra-controls {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
    }

    .player-controls {
      grid-column: 1 / -1;
      grid-row: 2;
      max-width: none;
    }

    .control-buttons {
      gap: 6px;
    }

    .volume-container {
      gap: 2px;
    }

    .volume-slider {
      display: none;
    }
  }
</style>
