import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Playlist, ExtractedVideo } from '../../preload/preload'
import { useToast } from '../composables/useToast'
import { getUserFriendlyErrorMessage, getSuccessMessage, getErrorMessage } from '../utils/errorMessages'
import { logger } from '../utils/logger'

export const usePlaylistsStore = defineStore('playlists', () => {
  const toast = useToast()
  const playlists = ref<Playlist[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentPlaylist = ref<Playlist | null>(null)

  const hasPlaylists = computed(() => playlists.value.length > 0)
  const playlistsCount = computed(() => playlists.value.length)

  async function loadPlaylists() {
    isLoading.value = true
    error.value = null
    try {
      playlists.value = await window.electronAPI.store.getPlaylists()
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '加载播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to load playlists:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function createPlaylist(name: string, description?: string): Promise<Playlist | null> {
    try {
      const playlist = await window.electronAPI.store.createPlaylist(name, description)
      playlists.value.push(playlist)
      toast.success(getSuccessMessage('createPlaylist'))
      return playlist
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '创建播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to create playlist:', e)
      return null
    }
  }

  async function updatePlaylist(id: string, updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.updatePlaylist(id, updates)
      if (result) {
        const index = playlists.value.findIndex(p => p.id === id)
        if (index !== -1) {
          playlists.value[index] = result
        }
        toast.success(getSuccessMessage('updatePlaylist'))
      } else {
        toast.error(getErrorMessage('updatePlaylist'))
      }
      return result !== null
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '更新播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to update playlist:', e)
      return false
    }
  }

  async function deletePlaylist(id: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.deletePlaylist(id)
      if (result) {
        playlists.value = playlists.value.filter(p => p.id !== id)
        if (currentPlaylist.value?.id === id) {
          currentPlaylist.value = null
        }
        toast.success(getSuccessMessage('deletePlaylist'))
      } else {
        toast.error(getErrorMessage('deletePlaylist'))
      }
      return result
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '删除播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to delete playlist:', e)
      return false
    }
  }

  async function addVideoToPlaylist(playlistId: string, video: ExtractedVideo): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.addVideoToPlaylist(playlistId, video)
      if (result) {
        await loadPlaylists()
        toast.success(getSuccessMessage('addToPlaylist'))
      } else {
        toast.error(getErrorMessage('addToPlaylist'))
      }
      return result
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '添加到播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to add video to playlist:', e)
      return false
    }
  }

  async function removeVideoFromPlaylist(playlistId: string, bvid: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.removeVideoFromPlaylist(playlistId, bvid)
      if (result) {
        const playlist = playlists.value.find(p => p.id === playlistId)
        if (playlist) {
          playlist.videos = playlist.videos.filter(v => v.bvid !== bvid)
          playlist.updatedAt = Date.now()
        }
        toast.success(getSuccessMessage('removeFromPlaylist'))
      } else {
        toast.error(getErrorMessage('removeFromPlaylist'))
      }
      return result
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '从播放列表移除失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to remove video from playlist:', e)
      return false
    }
  }

  function setCurrentPlaylist(playlist: Playlist | null) {
    currentPlaylist.value = playlist
  }

  function getPlaylistById(id: string): Playlist | undefined {
    return playlists.value.find(p => p.id === id)
  }

  return {
    playlists,
    isLoading,
    error,
    currentPlaylist,
    hasPlaylists,
    playlistsCount,
    loadPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    setCurrentPlaylist,
    getPlaylistById
  }
})
