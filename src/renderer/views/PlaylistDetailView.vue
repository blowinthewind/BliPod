<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ListMusic, Play, ArrowLeft, Trash2, Edit3, Shuffle } from 'lucide-vue-next'
  import LazyImage from '../components/ui/LazyImage.vue'
  import Input from '../components/ui/Input.vue'
  import EmptyState from '../components/ui/EmptyState.vue'
  import ScrollToButtons from '../components/ui/ScrollToButtons.vue'
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
  const editModalRef = ref<HTMLDivElement | null>(null)
  const editNameInputRef = ref<HTMLInputElement | null>(null)
  const lastFocusedElementRef = ref<HTMLElement | null>(null)

  onMounted(() => {
    playlistsStore.loadPlaylists()
  })

  watch(
    playlist,
    (newPlaylist) => {
      if (newPlaylist) {
        editName.value = newPlaylist.name
        editDescription.value = newPlaylist.description || ''
      }
    },
    { immediate: true }
  )

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

  function goBack() {
    router.push({ name: 'playlists' })
  }

  function playVideo(video: PlaylistVideo) {
    playerStore.playVideo(video, videos.value, 'playlist')
  }

  function playAll() {
    if (videos.value.length > 0) {
      playerStore.playVideo(videos.value[0], videos.value, 'playlist')
    }
  }

  function shufflePlay() {
    if (videos.value.length > 0) {
      const shuffled = [...videos.value].sort(() => Math.random() - 0.5)
      playerStore.playVideo(shuffled[0], shuffled, 'playlist')
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

  function closeEditModal() {
    showEditModal.value = false
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

  function handleEditDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeEditModal()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(editModalRef.value)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (activeElement === firstElement || !editModalRef.value?.contains(activeElement)) {
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
        <div class="header-cover" v-if="videos.length > 0 && videos[0].cover">
          <LazyImage
            :src="videos[0].cover"
            :alt="playlist.name"
            :width="320"
            aspect-ratio="16/9"
            placeholder-icon="image"
          />
        </div>
        <div class="header-icon" v-else>
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
          <button class="action-btn primary" v-if="videos.length > 0" @click="playAll">
            <Play :size="18" />
            播放全部
          </button>
          <button class="action-btn secondary" v-if="videos.length > 1" @click="shufflePlay">
            <Shuffle :size="18" />
            随机播放
          </button>
          <button
            class="action-btn icon"
            type="button"
            aria-label="编辑播放列表"
            @click="openEditModal"
          >
            <Edit3 :size="18" />
          </button>
        </div>
      </div>

      <div class="videos-list" v-if="videos.length > 0">
        <div v-for="(video, index) in videos" :key="video.bvid" class="video-item">
          <span class="item-index">{{ index + 1 }}</span>
          <button
            class="video-item-main"
            type="button"
            :aria-label="`播放播放列表视频 ${video.title}`"
            @click="playVideo(video)"
          >
            <div class="item-cover">
              <LazyImage
                v-if="video.cover"
                :src="video.cover"
                :alt="video.title"
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
              <span class="item-duration">{{ formatDuration(video.duration) }}</span>
            </div>
            <div class="item-info">
              <h3 class="item-title">{{ video.title }}</h3>
              <div class="item-meta">
                <span class="meta-author">{{ video.author }}</span>
                <span class="meta-date">添加于 {{ formatDate(video.addedAt) }}</span>
              </div>
            </div>
          </button>
          <div class="item-actions">
            <button
              class="action-btn play"
              type="button"
              :aria-label="`播放 ${video.title}`"
              @click.stop="playVideo(video)"
            >
              <Play :size="18" />
            </button>
            <button
              class="action-btn remove"
              type="button"
              :aria-label="`从播放列表中移除 ${video.title}`"
              @click.stop="removeVideo(video.bvid)"
            >
              <Trash2 :size="18" />
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        :icon="ListMusic"
        title="播放列表为空"
        description="从搜索结果或收藏中添加视频"
      />

      <ScrollToButtons v-if="videos.length > 5" scroll-container=".content-area" :threshold="5" />
    </template>

    <EmptyState
      v-else
      :icon="ListMusic"
      title="播放列表不存在"
      action="返回播放列表"
      class="not-found"
      @action="goBack"
    />

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
        <Input
          id="edit-playlist-name"
          ref="editNameInputRef"
          class="modal-input"
          placeholder="输入列表名称..."
          v-model="editName"
          @keyup.enter="updatePlaylist"
          aria-label="播放列表名称"
        />
        <label class="sr-only" for="edit-playlist-description">播放列表描述</label>
        <textarea
          id="edit-playlist-description"
          class="modal-textarea"
          placeholder="输入描述（可选）..."
          v-model="editDescription"
          rows="3"
          aria-label="播放列表描述"
        ></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" type="button" @click="closeEditModal">取消</button>
          <button
            class="modal-btn confirm"
            type="button"
            @click="updatePlaylist"
            :disabled="!editName.trim()"
          >
            保存
          </button>
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
    gap: 14px;
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
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
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
    background: linear-gradient(135deg, var(--accent), var(--accent-amber));
    color: white;
    flex-shrink: 0;
  }

  .header-cover {
    position: relative;
    width: clamp(88px, 12vw, 100px);
    aspect-ratio: 25 / 14;
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-card);
    flex-shrink: 0;
  }

  .header-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .header-text {
    flex: 1;
    min-width: 0;
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

  .page-description {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 4px;
    line-height: 1.5;
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
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
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
    gap: 10px;
  }

  .video-item {
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

  .video-item:hover,
  .video-item:focus-within {
    background: var(--bg-card);
    border-color: var(--border);
  }

  .video-item-main {
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

  .video-item:hover .item-cover img,
  .video-item:focus-within .item-cover img {
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

  .video-item:hover .cover-overlay,
  .video-item:focus-within .cover-overlay {
    opacity: 1;
  }

  .play-btn-overlay {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .play-btn-overlay:hover {
    transform: scale(1.1);
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

  .item-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .video-item:hover .item-actions,
  .video-item:focus-within .item-actions {
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
    color: var(--error);
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
    background: var(--bg-overlay);
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

  :deep(.modal-input.input-base) {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .modal-input:focus,
  :deep(.modal-input.input-base:focus) {
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

  @media (max-width: 768px) {
    .page-header {
      align-items: flex-start;
    }

    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .item-cover {
      width: clamp(88px, 18vw, 100px);
      height: auto;
      aspect-ratio: 5 / 3;
    }
  }

  @media (max-width: 640px) {
    .page-header {
      gap: 12px;
    }

    .header-actions {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .video-item {
      align-items: flex-start;
    }

    .video-item-main {
      gap: 12px;
    }

    .item-meta {
      gap: 8px;
      flex-wrap: wrap;
    }

    .modal-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
  }

  @media (max-width: 520px) {
    .video-item {
      gap: 10px;
      padding: 10px;
    }

    .video-item-main {
      align-items: flex-start;
    }

    .item-cover {
      width: 88px;
    }

    .item-actions {
      opacity: 1;
      align-self: flex-start;
    }
  }
</style>
