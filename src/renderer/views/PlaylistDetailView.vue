<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListMusic, Play, ArrowLeft, Trash2, Edit3, Shuffle } from 'lucide-vue-next'
import { usePlaylistsStore } from '../stores/playlists'
import { usePlayerStore } from '../stores/player'
import type { PlaylistVideo } from '../../preload/preload'

const route = useRoute()
const router = useRouter()
const playlistsStore = usePlaylistsStore()
const playerStore = usePlayerStore()

const playlistId = computed(() => route.params.id as string)
const playlist = computed(() => playlistsStore.getPlaylistById(playlistId.value))
const isLoading = computed(() => playlistsStore.isLoading)
const videos = computed(() => playlist.value?.videos || [])

const showEditModal = ref(false)
const editName = ref('')
const editDescription = ref('')

let playerUnsubscribe: (() => void) | null = null
let progressUnsubscribe: (() => void) | null = null

onMounted(() => {
  playlistsStore.loadPlaylists()
  setupListeners()
})

onUnmounted(() => {
  if (playerUnsubscribe) {
    playerUnsubscribe()
  }
  if (progressUnsubscribe) {
    progressUnsubscribe()
  }
})

function setupListeners() {
  playerUnsubscribe = playerStore.setReadyListener()
  progressUnsubscribe = playerStore.setProgressListener()
}

watch(playlist, (newPlaylist) => {
  if (newPlaylist) {
    editName.value = newPlaylist.name
    editDescription.value = newPlaylist.description || ''
  }
}, { immediate: true })

function goBack() {
  router.push({ name: 'playlists' })
}

function playVideo(video: PlaylistVideo) {
  playerStore.playVideo(video, videos.value)
}

function playAll() {
  if (videos.value.length > 0) {
    playerStore.playVideo(videos.value[0], videos.value)
  }
}

function shufflePlay() {
  if (videos.value.length > 0) {
    const shuffled = [...videos.value].sort(() => Math.random() - 0.5)
    playerStore.playVideo(shuffled[0], shuffled)
  }
}

async function removeVideo(bvid: string) {
  if (playlist.value) {
    await playlistsStore.removeVideoFromPlaylist(playlist.value.id, bvid)
  }
}

function openEditModal() {
  if (playlist.value) {
    editName.value = playlist.value.name
    editDescription.value = playlist.value.description || ''
    showEditModal.value = true
  }
}

async function updatePlaylist() {
  if (playlist.value && editName.value.trim()) {
    await playlistsStore.updatePlaylist(playlist.value.id, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined
    })
    showEditModal.value = false
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatDuration(duration: string): string {
  return duration
}
</script>

<template>
  <div class="playlist-detail-view">
    <div v-if="isLoading" class="loading-state">
      <span>加载中...</span>
    </div>

    <template v-else-if="playlist">
      <div class="page-header">
        <button class="back-btn" @click="goBack">
          <ArrowLeft :size="20" />
        </button>
        <div class="header-icon">
          <ListMusic :size="24" />
        </div>
        <div class="header-text">
          <h1 class="page-title">{{ playlist.name }}</h1>
          <p class="page-desc">
            {{ videos.length }} 个视频 · 创建于 {{ formatDate(playlist.createdAt) }}
          </p>
          <p v-if="playlist.description" class="page-description">{{ playlist.description }}</p>
        </div>
        <div class="header-actions">
          <button 
            class="action-btn primary" 
            v-if="videos.length > 0"
            @click="playAll"
          >
            <Play :size="18" />
            播放全部
          </button>
          <button 
            class="action-btn secondary" 
            v-if="videos.length > 1"
            @click="shufflePlay"
          >
            <Shuffle :size="18" />
            随机播放
          </button>
          <button class="action-btn icon" @click="openEditModal">
            <Edit3 :size="18" />
          </button>
        </div>
      </div>

      <div class="videos-list" v-if="videos.length > 0">
        <div
          v-for="(video, index) in videos"
          :key="video.bvid"
          class="video-item"
          @click="playVideo(video)"
        >
          <span class="item-index">{{ index + 1 }}</span>
          <div class="item-cover">
            <img
              v-if="video.cover"
              :src="video.cover"
              :alt="video.title"
              loading="lazy"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <div v-else class="cover-placeholder">🎵</div>
            <span class="item-duration">{{ formatDuration(video.duration) }}</span>
          </div>
          <div class="item-info">
            <h3 class="item-title">{{ video.title }}</h3>
            <div class="item-meta">
              <span class="meta-author">{{ video.author }}</span>
              <span class="meta-date">添加于 {{ formatDate(video.addedAt) }}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="action-btn play" title="播放" @click.stop="playVideo(video)">
              <Play :size="18" />
            </button>
            <button class="action-btn remove" title="移除" @click.stop="removeVideo(video.bvid)">
              <Trash2 :size="18" />
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <ListMusic :size="48" class="empty-icon" />
        <h3>播放列表为空</h3>
        <p>从搜索结果或收藏中添加视频</p>
      </div>
    </template>

    <div class="not-found" v-else>
      <ListMusic :size="48" class="empty-icon" />
      <h3>播放列表不存在</h3>
      <button class="back-link" @click="goBack">返回播放列表</button>
    </div>

    <div class="modal-overlay" v-if="showEditModal" @click.self="showEditModal = false">
      <div class="modal">
        <h2 class="modal-title">编辑播放列表</h2>
        <input
          type="text"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="editName"
          @keyup.enter="updatePlaylist"
        />
        <textarea
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="editDescription"
          rows="3"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showEditModal = false">取消</button>
          <button class="modal-btn confirm" @click="updatePlaylist" :disabled="!editName.trim()">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlist-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  color: var(--text-secondary);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.back-btn {
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

.back-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
}

.header-text {
  flex: 1;
  min-width: 200px;
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

.page-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: var(--accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--accent-hover);
}

.action-btn.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

.action-btn.secondary:hover {
  background: var(--bg-primary);
}

.action-btn.icon {
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  color: var(--text-secondary);
}

.action-btn.icon:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.videos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.video-item:hover {
  background: var(--bg-card);
}

.item-index {
  width: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  flex-shrink: 0;
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
  opacity: 0;
  transition: opacity 0.2s;
}

.video-item:hover .item-actions {
  opacity: 1;
}

.action-btn.play,
.action-btn.remove {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
}

.action-btn.play:hover {
  background: var(--bg-primary);
  color: var(--accent);
}

.action-btn.remove:hover {
  background: var(--bg-primary);
  color: #ff5252;
}

.empty-state,
.not-found {
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

.empty-state h3,
.not-found h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}

.back-link {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--accent-hover);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 400px;
  max-width: 90vw;
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.modal-input:focus {
  border-color: var(--accent);
}

.modal-textarea {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.modal-textarea:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--bg-card);
  color: var(--text-primary);
}

.modal-btn.cancel:hover {
  background: var(--bg-primary);
}

.modal-btn.confirm {
  background: var(--accent);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  background: var(--accent-hover);
}
</style>
