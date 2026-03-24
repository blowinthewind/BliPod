<script setup lang="ts">
  import { computed, onMounted, ref, toRaw } from 'vue'
  import { ListMusic, Plus, Check, X } from 'lucide-vue-next'
  import { cn } from '@/lib/utils'
  import Button from '../ui/Button.vue'
  import DialogOverlay from '../ui/DialogOverlay.vue'
  import DialogPanel from '../ui/DialogPanel.vue'
  import Input from '../ui/Input.vue'
  import { useDialogFocusTrap } from '../../composables/useDialogFocusTrap'
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
  const dialogRef = ref<HTMLDivElement | null>(null)
  const closeButtonRef = ref<HTMLButtonElement | null>(null)
  const createModalRef = ref<HTMLDivElement | null>(null)
  const createInputRef = ref<HTMLInputElement | null>(null)

  onMounted(() => {
    playlistsStore.loadPlaylists()
  })

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

  function closeCreateModal() {
    showCreateModal.value = false
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

  const { handleKeydown: handleDialogKeydown } = useDialogFocusTrap({
    open: computed(() => props.visible),
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    excludeRef: createModalRef,
    onClose: close,
    restoreFocusWhen: () => !showCreateModal.value
  })

  const { handleKeydown: handleCreateModalKeydown } = useDialogFocusTrap({
    open: showCreateModal,
    containerRef: createModalRef,
    initialFocusRef: createInputRef,
    onClose: closeCreateModal
  })
</script>

<template>
  <DialogOverlay class="modal-overlay" v-if="visible" @close="close">
    <DialogPanel
      ref="dialogRef"
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
      @keydown="handleDialogKeydown"
    >
      <div class="dialog-header">
        <h2 id="add-to-playlist-title" class="dialog-title">添加到播放列表</h2>
        <button
          ref="closeButtonRef"
          class="close-btn"
          type="button"
          aria-label="关闭添加到播放列表弹窗"
          @click="close"
        >
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
        <Button
          :class="cn('create-new-btn', showCreateModal && 'create-new-btn--active')"
          variant="outline"
          type="button"
          @click="openCreateModal"
        >
          <Plus :size="18" />
          新建播放列表
        </Button>

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

      <DialogOverlay class="create-modal-overlay" v-if="showCreateModal" @close="closeCreateModal">
        <DialogPanel
          ref="createModalRef"
          class="create-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-playlist-title"
          @keydown.stop="handleCreateModalKeydown"
        >
          <h3 id="create-playlist-title" class="create-title">新建播放列表</h3>
          <label class="sr-only" for="new-playlist-name">播放列表名称</label>
          <Input
            id="new-playlist-name"
            ref="createInputRef"
            class="create-input"
            placeholder="输入列表名称..."
            v-model="newPlaylistName"
            @keyup.enter="createAndAdd"
            aria-label="播放列表名称"
          />
          <div class="create-actions">
            <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
            <Button variant="default" type="button" @click="createAndAdd" :disabled="!newPlaylistName.trim()">
              创建并添加
            </Button>
          </div>
        </DialogPanel>
      </DialogOverlay>
    </DialogPanel>
  </DialogOverlay>
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
    background: var(--bg-overlay);
    z-index: 1000;
    padding: 12px;
  }

  .dialog {
    display: flex;
    flex-direction: column;
    width: min(420px, 100%);
    max-width: 100%;
    max-height: min(80vh, 720px);
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
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
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
    width: 100%;
    margin-bottom: 12px;
    border-style: dashed;
    border-width: 2px;
    color: var(--text-secondary);
  }

  .create-new-btn:hover,
  .create-new-btn--active {
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
    transition:
      background-color 0.2s,
      color 0.2s,
      border-color 0.2s,
      opacity 0.2s;
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
    background: var(--accent-muted);
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
    color: var(--text-on-accent);
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
    background: var(--bg-overlay);
  }

  .create-modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(320px, calc(100% - 24px));
    max-width: 100%;
    padding: clamp(16px, 4vw, 20px);
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 480px) {
    .dialog-header {
      padding: 14px 16px;
    }

    .video-preview {
      padding: 14px 16px;
    }

    .playlists-section {
      padding: 10px;
    }
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

  :deep(.create-input.input-base) {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .create-input:focus,
  :deep(.create-input.input-base:focus) {
    border-color: var(--accent);
  }

  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }


  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
