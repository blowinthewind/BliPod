<script setup lang="ts">
import { ref } from 'vue'
import { ListMusic, Play, Plus, MoreHorizontal } from 'lucide-vue-next'

const playlists = ref([
  { id: 1, name: '学习资料', count: 12, createdAt: '2024-01-10' },
  { id: 2, name: '音乐MV', count: 8, createdAt: '2024-01-08' },
  { id: 3, name: '游戏视频', count: 5, createdAt: '2024-01-05' }
])

const showCreateModal = ref(false)
const newPlaylistName = ref('')

function createPlaylist() {
  if (newPlaylistName.value.trim()) {
    playlists.value.push({
      id: Date.now(),
      name: newPlaylistName.value,
      count: 0,
      createdAt: new Date().toISOString().split('T')[0]
    })
    newPlaylistName.value = ''
    showCreateModal.value = false
  }
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
      <button class="create-btn" @click="showCreateModal = true">
        <Plus :size="18" />
        新建列表
      </button>
    </div>

    <div class="playlists-grid" v-if="playlists.length > 0">
      <div
        v-for="playlist in playlists"
        :key="playlist.id"
        class="playlist-card"
      >
        <div class="playlist-cover">
          <div class="cover-placeholder">
            <ListMusic :size="32" />
          </div>
          <button class="play-overlay">
            <Play :size="24" />
          </button>
        </div>
        <div class="playlist-info">
          <h3 class="playlist-name">{{ playlist.name }}</h3>
          <p class="playlist-meta">{{ playlist.count }} 个视频</p>
        </div>
        <button class="more-btn">
          <MoreHorizontal :size="18" />
        </button>
      </div>
    </div>

    <div class="empty-state" v-else>
      <ListMusic :size="48" class="empty-icon" />
      <h3>暂无播放列表</h3>
      <p>创建你的第一个播放列表</p>
      <button class="create-btn" @click="showCreateModal = true">
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
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showCreateModal = false">取消</button>
          <button class="modal-btn confirm" @click="createPlaylist">创建</button>
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

.more-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.playlist-card:hover .more-btn {
  opacity: 1;
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

.modal-btn.confirm:hover {
  background: var(--accent-hover);
}
</style>
