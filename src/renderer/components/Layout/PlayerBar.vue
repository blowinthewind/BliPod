<script setup lang="ts">
import { ref, computed } from 'vue'
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

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(180)
const volume = ref(80)
const isMuted = ref(false)
const isRepeat = ref(false)
const isShuffle = ref(false)

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const formattedCurrentTime = computed(() => formatTime(currentTime.value))
const formattedDuration = computed(() => formatTime(duration.value))

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

function toggleMute() {
  isMuted.value = !isMuted.value
}

function toggleRepeat() {
  isRepeat.value = !isRepeat.value
}

function toggleShuffle() {
  isShuffle.value = !isShuffle.value
}

function seekTo(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  currentTime.value = percent * duration.value
}

function handleVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  volume.value = parseInt(target.value)
  if (volume.value > 0) {
    isMuted.value = false
  }
}
</script>

<template>
  <footer class="player-bar">
    <div class="now-playing">
      <div class="track-cover">
        <div class="cover-placeholder">🎵</div>
      </div>
      <div class="track-info">
        <span class="track-title">等待播放...</span>
        <span class="track-artist">选择一个视频开始播放</span>
      </div>
      <button class="like-btn">
        <span class="like-icon">♡</span>
      </button>
    </div>

    <div class="player-controls">
      <div class="control-buttons">
        <button
          class="control-btn small"
          :class="{ active: isShuffle }"
          @click="toggleShuffle"
          title="随机播放"
        >
          <Shuffle :size="16" />
        </button>
        <button class="control-btn" title="上一首">
          <SkipBack :size="20" />
        </button>
        <button class="control-btn play-btn" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
          <Play v-if="!isPlaying" :size="22" />
          <Pause v-else :size="22" />
        </button>
        <button class="control-btn" title="下一首">
          <SkipForward :size="20" />
        </button>
        <button
          class="control-btn small"
          :class="{ active: isRepeat }"
          @click="toggleRepeat"
          title="循环播放"
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
        <span class="time">{{ formattedDuration }}</span>
      </div>
    </div>

    <div class="extra-controls">
      <button class="control-btn small" title="播放列表">
        <ListMusic :size="18" />
      </button>
      <div class="volume-container">
        <button class="control-btn small" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
          <VolumeX v-if="isMuted" :size="18" />
          <Volume2 v-else :size="18" />
        </button>
        <div class="volume-slider">
          <input
            type="range"
            min="0"
            max="100"
            :value="isMuted ? 0 : volume"
            @input="handleVolumeChange"
          />
        </div>
      </div>
      <button class="control-btn small" title="全屏">
        <Maximize2 :size="18" />
      </button>
    </div>
  </footer>
</template>

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

.control-btn:hover {
  color: var(--accent);
}

.control-btn.small {
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
}

.control-btn.small:hover {
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

.play-btn:hover {
  transform: scale(1.05);
  background: var(--text-primary) !important;
  color: var(--bg-primary) !important;
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
