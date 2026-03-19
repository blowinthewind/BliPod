<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { ListMusic, Plus, Trash2, Edit3 } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import { usePlaylistsStore } from '../stores/playlists'
  import type { Playlist } from '../../preload/preload'

  const router = useRouter()
  const playlistsStore = usePlaylistsStore()

  const isLoading = computed(() => playlistsStore.isLoading)
  const playlists = computed(() => playlistsStore.playlists)

  const showCreateModal = ref(false)
  const showEditModal = ref(false)
  const showDeleteConfirm = ref(false)
  const editingPlaylist = ref<Playlist | null>(null)
  const deletingPlaylist = ref<Playlist | null>(null)
  const newPlaylistName = ref('')
  const newPlaylistDescription = ref('')
  const createModalRef = ref<HTMLDivElement | null>(null)
  const editModalRef = ref<HTMLDivElement | null>(null)
  const deleteModalRef = ref<HTMLDivElement | null>(null)
  const createNameInputRef = ref<HTMLInputElement | null>(null)
  const editNameInputRef = ref<HTMLInputElement | null>(null)
  const deleteCancelButtonRef = ref<HTMLButtonElement | null>(null)
  const lastFocusedElementRef = ref<HTMLElement | null>(null)

  onMounted(() => {
    playlistsStore.loadPlaylists()
  })

  watch(showCreateModal, async (visible) => {
    if (visible) {
      lastFocusedElementRef.value = document.activeElement as HTMLElement | null
      await nextTick()
      createNameInputRef.value?.focus()
      return
    }

    await nextTick()
    lastFocusedElementRef.value?.focus()
  })

  watch(showEditModal, async (visible) => {
    if (visible) {
      lastFocusedElementRef.value = document.activeElement as HTMLElement | null
      await nextTick()
      editNameInputRef.value?.focus()
      return
    }

    await nextTick()
    lastFocusedElementRef.value?.focus()
  })

  watch(showDeleteConfirm, async (visible) => {
    if (visible) {
      lastFocusedElementRef.value = document.activeElement as HTMLElement | null
      await nextTick()
      deleteCancelButtonRef.value?.focus()
      return
    }

    await nextTick()
    lastFocusedElementRef.value?.focus()
  })

  function openCreateModal() {
    newPlaylistName.value = ''
    newPlaylistDescription.value = ''
    showCreateModal.value = true
  }

  function closeCreateModal() {
    showCreateModal.value = false
  }

  async function createPlaylist() {
    if (newPlaylistName.value.trim()) {
      await playlistsStore.createPlaylist(
        newPlaylistName.value.trim(),
        newPlaylistDescription.value.trim() || undefined
      )
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

  function closeEditModal() {
    showEditModal.value = false
    editingPlaylist.value = null
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

  function closeDeleteConfirm() {
    showDeleteConfirm.value = false
    deletingPlaylist.value = null
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

  function getFocusableElements(container: HTMLElement | null) {
    if (!container) return [] as HTMLElement[]

    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
    )
  }

  function trapFocus(event: KeyboardEvent, container: HTMLElement | null, onEscape: () => void) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (activeElement === firstElement || !container?.contains(activeElement)) {
        event.preventDefault()
        lastElement.focus()
      }
      return
    }

    if (activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function handleCreateDialogKeydown(event: KeyboardEvent) {
    trapFocus(event, createModalRef.value, closeCreateModal)
  }

  function handleEditDialogKeydown(event: KeyboardEvent) {
    trapFocus(event, editModalRef.value, closeEditModal)
  }

  function handleDeleteDialogKeydown(event: KeyboardEvent) {
    trapFocus(event, deleteModalRef.value, closeDeleteConfirm)
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
      <button class="create-btn" v-if="playlists.length > 0" @click="openCreateModal">
        <Plus :size="18" />
        新建列表
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <span>加载中...</span>
    </div>

    <div class="playlists-grid" v-else-if="playlists.length > 0">
      <div v-for="playlist in playlists" :key="playlist.id" class="playlist-card">
        <button
          class="playlist-card-main"
          type="button"
          :aria-label="`打开播放列表 ${playlist.name}`"
          @click="openPlaylist(playlist)"
        >
          <div class="playlist-cover">
            <LazyImage
              v-if="playlist.videos.length > 0 && playlist.videos[0].cover"
              :src="playlist.videos[0].cover"
              :alt="playlist.name"
              :width="480"
              aspect-ratio="16/9"
              placeholder-icon="image"
            />
            <div v-else class="cover-placeholder">
              <ListMusic :size="32" />
            </div>
            <div class="video-count-badge" v-if="playlist.videos.length > 0">
              {{ playlist.videos.length }}
            </div>
          </div>
          <div class="playlist-info">
            <h3 class="playlist-name">{{ playlist.name }}</h3>
            <p class="playlist-meta">
              {{ playlist.videos.length }} 个视频 · {{ formatDate(playlist.createdAt) }}
            </p>
          </div>
        </button>
        <div class="card-actions">
          <button
            class="action-btn edit"
            type="button"
            :aria-label="`编辑播放列表 ${playlist.name}`"
            @click.stop="openEditModal(playlist)"
          >
            <Edit3 :size="16" />
          </button>
          <button
            class="action-btn delete"
            type="button"
            :aria-label="`删除播放列表 ${playlist.name}`"
            @click.stop="openDeleteConfirm(playlist)"
          >
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

    <div class="modal-overlay" v-if="showCreateModal" @click.self="closeCreateModal">
      <div
        ref="createModalRef"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
        @keydown="handleCreateDialogKeydown"
      >
        <h2 id="create-playlist-title" class="modal-title">新建播放列表</h2>
        <label class="sr-only" for="create-playlist-name">播放列表名称</label>
        <input
          id="create-playlist-name"
          ref="createNameInputRef"
          type="text"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="newPlaylistName"
          @keyup.enter="createPlaylist"
          aria-label="播放列表名称"
        />
        <label class="sr-only" for="create-playlist-description">播放列表描述</label>
        <textarea
          id="create-playlist-description"
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="newPlaylistDescription"
          rows="3"
          aria-label="播放列表描述"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" type="button" @click="closeCreateModal">取消</button>
          <button
            class="modal-btn confirm"
            type="button"
            @click="createPlaylist"
            :disabled="!newPlaylistName.trim()"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showEditModal" @click.self="closeEditModal">
      <div
        ref="editModalRef"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-playlist-title"
        @keydown="handleEditDialogKeydown"
      >
        <h2 id="edit-playlist-title" class="modal-title">编辑播放列表</h2>
        <label class="sr-only" for="edit-playlist-name">播放列表名称</label>
        <input
          id="edit-playlist-name"
          ref="editNameInputRef"
          type="text"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="newPlaylistName"
          @keyup.enter="updatePlaylist"
          aria-label="播放列表名称"
        />
        <label class="sr-only" for="edit-playlist-description">播放列表描述</label>
        <textarea
          id="edit-playlist-description"
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="newPlaylistDescription"
          rows="3"
          aria-label="播放列表描述"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" type="button" @click="closeEditModal">取消</button>
          <button
            class="modal-btn confirm"
            type="button"
            @click="updatePlaylist"
            :disabled="!newPlaylistName.trim()"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showDeleteConfirm" @click.self="closeDeleteConfirm">
      <div
        ref="deleteModalRef"
        class="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-playlist-title"
        aria-describedby="delete-playlist-description"
        @keydown="handleDeleteDialogKeydown"
      >
        <h2 id="delete-playlist-title" class="modal-title">确认删除</h2>
        <p class="confirm-text">
          <span id="delete-playlist-description">
            确定要删除播放列表「{{ deletingPlaylist?.name }}」吗？此操作不可撤销。
          </span>
        </p>
        <div class="modal-actions">
          <button
            ref="deleteCancelButtonRef"
            class="modal-btn cancel"
            type="button"
            @click="closeDeleteConfirm"
          >
            取消
          </button>
          <button class="modal-btn delete" type="button" @click="deletePlaylist">删除</button>
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
    background: linear-gradient(135deg, var(--accent), var(--accent-sky));
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

  .create-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
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
    gap: 20px;
  }

  .playlist-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 12px 14px;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle, transparent);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
    position: relative;
  }

  .playlist-card:hover,
  .playlist-card:focus-within {
    background: var(--bg-card);
    transform: translateY(-2px);
    border-color: var(--border);
  }

  .playlist-card-main {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .playlist-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-card);
  }

  .cover-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  .video-count-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 4px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: white;
  }

  .playlist-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .playlist-name {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.35;
  }

  .playlist-meta {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.4;
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

  .playlist-card:hover .card-actions,
  .playlist-card:focus-within .card-actions {
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
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
  }

  .action-btn:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .action-btn.edit:hover {
    color: var(--accent);
  }

  .action-btn.delete:hover {
    color: var(--error);
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
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--text-primary);
  }

  .empty-state p {
    font-size: var(--text-sm);
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
    padding: 12px;
  }

  .modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(400px, 100%);
    max-width: 100%;
    max-height: min(80vh, 720px);
    padding: clamp(16px, 4vw, 24px);
    background: var(--bg-secondary);
    border-radius: 12px;
    overflow: auto;
  }

  .modal-title {
    font-size: var(--text-lg);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
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
    background: var(--error);
    color: white;
  }

  .modal-btn.delete:hover {
    background: color-mix(in srgb, var(--error) 82%, black);
  }

  .confirm-modal .confirm-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .modal-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }

    .modal-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
