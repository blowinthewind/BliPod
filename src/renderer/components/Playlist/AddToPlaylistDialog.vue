<script setup lang="ts">
  import { computed, onMounted, ref, watch, toRaw } from 'vue'
  import { ListMusic, Plus, Check, X } from 'lucide-vue-next'
  import { usePlaylistsStore } from '../../stores/playlists'
  import type { ExtractedVideo } from '../../../preload/preload'

  const props = defineProps<{
    visible: boolean
    video: ExtractedVideo | null
  }>()

  const emit = defineEmits<{
    (e: 'close'): void
    (e: 'added'): void
    (e: 'removed'): void
  }>()

  const playlistsStore = usePlaylistsStore()

  // 排序后的播放列表：包含当前视频的播放列表置顶
  const sortedPlaylists = computed(() => {
    if (!props.video) return playlistsStore.playlists

    return [...playlistsStore.playlists].sort((a, b) => {
      const aHasVideo = a.videos.some((v) => v.bvid === props.video?.bvid)
      const bHasVideo = b.videos.some((v) => v.bvid === props.video?.bvid)

      if (aHasVideo && !bHasVideo) return -1
      if (!aHasVideo && bHasVideo) return 1
      return 0
    })
  })

  const showCreateModal = ref(false)
  const newPlaylistName = ref('')
  const isProcessing = ref<string | null>(null)

  onMounted(() => {
    playlistsStore.loadPlaylists()
  })

  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        playlistsStore.loadPlaylists()
      }
    }
  )

  function isVideoInPlaylist(playlistId: string): boolean {
    if (!props.video) return false
    const playlist = sortedPlaylists.value.find((p) => p.id === playlistId)
    return playlist ? playlist.videos.some((v) => v.bvid === props.video?.bvid) : false
  }

  async function togglePlaylist(playlistId: string) {
    if (!props.video || isProcessing.value) return

    isProcessing.value = playlistId
    const rawVideo = toRaw(props.video)
    const isInPlaylist = isVideoInPlaylist(playlistId)

    if (isInPlaylist) {
      const success = await playlistsStore.removeVideoFromPlaylist(playlistId, props.video.bvid)
      if (success) {
        emit('removed')
      }
    } else {
      const success = await playlistsStore.addVideoToPlaylist(playlistId, rawVideo)
      if (success) {
        emit('added')
      }
    }

    isProcessing.value = null
  }

  function openCreateModal() {
    newPlaylistName.value = ''
    showCreateModal.value = true
  }

  async function createAndAdd() {
    if (!newPlaylistName.value.trim() || !props.video) return

    const rawVideo = toRaw(props.video)
    const playlist = await playlistsStore.createPlaylist(newPlaylistName.value.trim())
    if (playlist) {
      const success = await playlistsStore.addVideoToPlaylist(playlist.id, rawVideo)
      if (success) {
        emit('added')
      }
      showCreateModal.value = false
    }
  }

  function close() {
    emit('close')
  }

  function isProcessingPlaylist(playlistId: string): boolean {
    return isProcessing.value === playlistId
  }
</script>

<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">添加到播放列表</h2>
        <button class="close-btn" @click="close">
          <X :size="18" />
        </button>
      </div>

      <div class="video-preview" v-if="video">
        <div class="preview-cover">
          <img v-if="video.cover" :src="video.cover" :alt="video.title" />
          <div v-else class="cover-placeholder">🎵</div>
        </div>
        <div class="preview-info">
          <h3 class="preview-title">{{ video.title }}</h3>
          <p class="preview-author">{{ video.author }}</p>
        </div>
      </div>

      <div class="playlists-section">
        <button class="create-new-btn" @click="openCreateModal">
          <Plus :size="18" />
          新建播放列表
        </button>

        <div class="playlists-list" v-if="sortedPlaylists.length > 0">
          <button
            v-for="playlist in sortedPlaylists"
            :key="playlist.id"
            class="playlist-item"
            :class="{ added: isVideoInPlaylist(playlist.id) }"
            :disabled="isProcessingPlaylist(playlist.id)"
            @click="togglePlaylist(playlist.id)"
          >
            <div class="playlist-icon">
              <ListMusic :size="18" />
            </div>
            <div class="playlist-info">
              <span class="playlist-name">{{ playlist.name }}</span>
              <span class="playlist-count">{{ playlist.videos.length }} 个视频</span>
            </div>
            <div class="playlist-status">
              <Check v-if="isVideoInPlaylist(playlist.id)" :size="18" class="check-icon" />
            </div>
          </button>
        </div>

        <div class="empty-hint" v-else>
          <p>暂无播放列表，创建一个吧</p>
        </div>
      </div>

      <div
        class="create-modal-overlay"
        v-if="showCreateModal"
        @click.self="showCreateModal = false"
      >
        <div class="create-modal">
          <h3 class="create-title">新建播放列表</h3>
          <input
            type="text"
            class="create-input"
            placeholder="输入列表名称..."
            v-model="newPlaylistName"
            @keyup.enter="createAndAdd"
            autofocus
          />
          <div class="create-actions">
            <button class="create-btn cancel" @click="showCreateModal = false">取消</button>
            <button
              class="create-btn confirm"
              @click="createAndAdd"
              :disabled="!newPlaylistName.trim()"
            >
              创建并添加
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

  .dialog {
    display: flex;
    flex-direction: column;
    width: 420px;
    max-width: 90vw;
    max-height: 80vh;
    background: var(--bg-secondary);
    border-radius: 12px;
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .dialog-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
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

  .close-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .video-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: var(--bg-card);
  }

  .preview-cover {
    width: 80px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-secondary);
    flex-shrink: 0;
  }

  .preview-cover img {
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
    font-size: var(--text-xl);
  }

  .preview-info {
    flex: 1;
    overflow: hidden;
  }

  .preview-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview-author {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .playlists-section {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .create-new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: 2px dashed var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;
  }

  .create-new-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .playlists-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .playlist-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }

  .playlist-item:hover:not(:disabled) {
    background: var(--bg-card);
  }

  .playlist-item:disabled {
    cursor: default;
  }

  .playlist-item.added {
    background: rgba(var(--accent-rgb), 0.1);
  }

  .playlist-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .playlist-item.added .playlist-icon {
    background: var(--accent);
    color: white;
  }

  .playlist-info {
    flex: 1;
    overflow: hidden;
  }

  .playlist-name {
    display: block;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .playlist-count {
    display: block;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .playlist-status {
    display: flex;
    align-items: center;
  }

  .loading {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .check-icon {
    color: var(--accent);
  }

  .empty-hint {
    text-align: center;
    padding: 24px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .create-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
  }

  .create-modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 320px;
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .create-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .create-input {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .create-input:focus {
    border-color: var(--accent);
  }

  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .create-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .create-btn.cancel {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .create-btn.cancel:hover {
    background: var(--bg-primary);
  }

  .create-btn.confirm {
    background: var(--accent);
    color: white;
  }

  .create-btn.confirm:hover:not(:disabled) {
    background: var(--accent-hover);
  }
</style>
