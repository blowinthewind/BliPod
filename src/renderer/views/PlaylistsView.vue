<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ListMusic, Play, Plus, Trash2, Edit3 } from 'lucide-vue-next'
import { usePlaylistsStore } from '../stores/playlists'
import { usePlayerStore } from '../stores/player'
import type { Playlist } from '../../preload/preload'

const router = useRouter()
const playlistsStore = usePlaylistsStore()
const playerStore = usePlayerStore()

const isLoading = computed(() => playlistsStore.isLoading)
const playlists = computed(() => playlistsStore.playlists)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingPlaylist = ref<Playlist | null>(null)
const deletingPlaylist = ref<Playlist | null>(null)
const newPlaylistName = ref('')
const newPlaylistDescription = ref('')

onMounted(() => {
  playlistsStore.loadPlaylists()
})

function openCreateModal() {
  newPlaylistName.value = ''
  newPlaylistDescription.value = ''
  showCreateModal.value = true
}

async function createPlaylist() {
  if (newPlaylistName.value.trim()) {
    await playlistsStore.createPlaylist(newPlaylistName.value.trim(), newPlaylistDescription.value.trim() || undefined)
    newPlaylistName.value = ''
    newPlaylistDescription.value = ''
    showCreateModal.value = false
  }
}

function openEditModal(playlist: Playlist) {
  editingPlaylist.value = playlist
  newPlaylistName.value = playlist.name
  newPlaylistDescription.value = playlist.description || ''
  showEditModal.value = true
}

async function updatePlaylist() {
  if (editingPlaylist.value && newPlaylistName.value.trim()) {
    await playlistsStore.updatePlaylist(editingPlaylist.value.id, {
      name: newPlaylistName.value.trim(),
      description: newPlaylistDescription.value.trim() || undefined
    })
    showEditModal.value = false
    editingPlaylist.value = null
  }
}

function openDeleteConfirm(playlist: Playlist) {
  deletingPlaylist.value = playlist
  showDeleteConfirm.value = true
}

async function deletePlaylist() {
  if (deletingPlaylist.value) {
    await playlistsStore.deletePlaylist(deletingPlaylist.value.id)
    showDeleteConfirm.value = false
    deletingPlaylist.value = null
  }
}

function openPlaylist(playlist: Playlist) {
  router.push({ name: 'playlist-detail', params: { id: playlist.id } })
}

function playPlaylist(playlist: Playlist, event: Event) {
  event.stopPropagation()
  if (playlist.videos.length > 0) {
    playerStore.playVideo(playlist.videos[0], playlist.videos)
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
</script>

<template>
  <div class="playlists-view">
    <div class="page-header">
      <div class="header-icon">
        <ListMusic :size="24" />
      </div>
      <div class="header-text">
        <h1 class="page-title">播放列表</h1>
        <p class="page-desc">{{ playlists.length }} 个列表</p>
      </div>
      <button class="create-btn" @click="openCreateModal">
        <Plus :size="18" />
        新建列表
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <span>加载中...</span>
    </div>

    <div class="playlists-grid" v-else-if="playlists.length > 0">
      <div
        v-for="playlist in playlists"
        :key="playlist.id"
        class="playlist-card"
        @click="openPlaylist(playlist)"
      >
        <div class="playlist-cover">
          <div class="cover-placeholder">
            <ListMusic :size="32" />
          </div>
          <button 
            class="play-overlay" 
            v-if="playlist.videos.length > 0"
            @click="playPlaylist(playlist, $event)"
          >
            <Play :size="24" />
          </button>
        </div>
        <div class="playlist-info">
          <h3 class="playlist-name">{{ playlist.name }}</h3>
          <p class="playlist-meta">{{ playlist.videos.length }} 个视频 · {{ formatDate(playlist.createdAt) }}</p>
        </div>
        <div class="card-actions">
          <button class="action-btn edit" title="编辑" @click.stop="openEditModal(playlist)">
            <Edit3 :size="16" />
          </button>
          <button class="action-btn delete" title="删除" @click.stop="openDeleteConfirm(playlist)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <ListMusic :size="48" class="empty-icon" />
      <h3>暂无播放列表</h3>
      <p>创建你的第一个播放列表</p>
      <button class="create-btn" @click="openCreateModal">
        <Plus :size="18" />
        新建列表
      </button>
    </div>

    <div class="modal-overlay" v-if="showCreateModal" @click.self="showCreateModal = false">
      <div class="modal">
        <h2 class="modal-title">新建播放列表</h2>
        <input
          type="text"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="newPlaylistName"
          @keyup.enter="createPlaylist"
        />
        <textarea
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="newPlaylistDescription"
          rows="3"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showCreateModal = false">取消</button>
          <button class="modal-btn confirm" @click="createPlaylist" :disabled="!newPlaylistName.trim()">创建</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showEditModal" @click.self="showEditModal = false">
      <div class="modal">
        <h2 class="modal-title">编辑播放列表</h2>
        <input
          type="text"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="newPlaylistName"
          @keyup.enter="updatePlaylist"
        />
        <textarea
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="newPlaylistDescription"
          rows="3"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showEditModal = false">取消</button>
          <button class="modal-btn confirm" @click="updatePlaylist" :disabled="!newPlaylistName.trim()">保存</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showDeleteConfirm" @click.self="showDeleteConfirm = false">
      <div class="modal confirm-modal">
        <h2 class="modal-title">确认删除</h2>
        <p class="confirm-text">确定要删除播放列表「{{ deletingPlaylist?.name }}」吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showDeleteConfirm = false">取消</button>
          <button class="modal-btn delete" @click="deletePlaylist">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlists-view {
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
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
}

.header-text {
  flex: 1;
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

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: var(--accent-hover);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  color: var(--text-secondary);
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.playlist-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.playlist-card:hover {
  background: var(--bg-card);
  transform: translateY(-2px);
}

.playlist-cover {
  position: relative;
  width: 100%;
  padding-top: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-card);
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.play-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.2s;
}

.playlist-card:hover .play-overlay {
  opacity: 1;
  transform: translateY(0);
}

.play-overlay:hover {
  transform: scale(1.1);
}

.playlist-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.playlist-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.playlist-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.playlist-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.action-btn.edit:hover {
  color: var(--accent);
}

.action-btn.delete:hover {
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
  gap: 8px;
}

.empty-icon {
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 16px;
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

.modal-btn.delete {
  background: #ff5252;
  color: white;
}

.modal-btn.delete:hover {
  background: #ff1744;
}

.confirm-modal .confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
