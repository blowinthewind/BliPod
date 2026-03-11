<script setup lang="ts">
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  ListMusic,
  Maximize2
} from 'lucide-vue-next'
import { computed } from 'vue'
import { usePlayerStore } from '../../stores/player'

const playerStore = usePlayerStore()

const progress = computed(() => playerStore.progress)
const formattedCurrentTime = computed(() => formatTime(playerStore.currentTime))
const formattedDuration = computed(() => formatTime(playerStore.duration))

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function seekTo(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  playerStore.seekByPercent(percent * 100)
}

function handleVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  playerStore.setVolume(parseInt(target.value))
}
</script>

<template>
  <footer class="player-bar">
    <div class="now-playing">
      <div class="track-cover">
        <img
          v-if="playerStore.currentVideo?.cover"
          :src="playerStore.currentVideo.cover"
          :alt="playerStore.currentVideo.title"
        />
        <div v-else class="cover-placeholder">
          <span v-if="playerStore.isLoading">⏳</span>
          <span v-else>🎵</span>
        </div>
      </div>
      <div class="track-info">
        <span class="track-title" :title="playerStore.currentVideo?.title">
          {{ playerStore.currentVideo?.title || 'Waiting to play...' }}
        </span>
        <span class="track-artist">
          {{ playerStore.currentVideo?.author || 'Select a video to play' }}
        </span>
      </div>
      <button class="like-btn" v-if="playerStore.hasVideo">
        <span class="like-icon">♡</span>
      </button>
    </div>

    <div class="player-controls">
      <div class="control-buttons">
        <button
          class="control-btn small"
          :class="{ active: playerStore.isShuffle }"
          @click="playerStore.toggleShuffle"
          title="Shuffle"
        >
          <Shuffle :size="16" />
        </button>
        <button
          class="control-btn"
          title="Previous"
          @click="playerStore.previous"
          :disabled="!playerStore.hasPrevious"
        >
          <SkipBack :size="20" />
        </button>
        <button
          class="control-btn play-btn"
          @click="playerStore.togglePlay"
          :title="playerStore.isPlaying ? 'Pause' : 'Play'"
          :disabled="!playerStore.hasVideo"
        >
          <Loader2 v-if="playerStore.isLoading" :size="22" class="animate-spin" />
          <Play v-else-if="!playerStore.isPlaying" :size="22" />
          <Pause v-else :size="22" />
        </button>
        <button
          class="control-btn"
          title="Next"
          @click="playerStore.next"
          :disabled="!playerStore.hasNext"
        >
          <SkipForward :size="20" />
        </button>
        <button
          class="control-btn small"
          :class="{ active: playerStore.isRepeat }"
          @click="playerStore.toggleRepeat"
          title="Repeat"
        >
          <Repeat :size="16" />
        </button>
      </div>

      <div class="progress-container">
        <span class="time">{{ formattedCurrentTime }}</span>
        <div class="progress-bar" @click="seekTo">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress}%` }">
              <div class="progress-thumb"></div>
            </div>
          </div>
        </div>
        <span class="time">{{ formattedDuration || '0:00' }}</span>
      </div>
    </div>

    <div class="extra-controls">
      <button class="control-btn small" title="Playlist">
        <ListMusic :size="18" />
      </button>
      <div class="volume-container">
        <button
          class="control-btn small"
          @click="playerStore.toggleMute"
          :title="playerStore.isMuted ? 'Unmute' : 'Mute'"
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
          />
        </div>
      </div>
      <button class="control-btn small" title="Fullscreen">
        <Maximize2 :size="18" />
      </button>
    </div>
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
  width: 240px;
  min-width: 180px;
}

.track-cover {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
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
  font-size: 24px;
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.track-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 12px;
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
  transition: all 0.2s;
}

.like-btn:hover {
  color: var(--accent);
}

.like-icon {
  font-size: 18px;
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
  transition: all 0.2s;
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.time {
  font-size: 11px;
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

.extra-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 240px;
  min-width: 180px;
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

.volume-slider input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-card);
  border-radius: 2px;
  outline: none;
}

.volume-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
}
</style>
