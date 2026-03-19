import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Playlist, ExtractedVideo } from '../../preload/preload'
import { useToast } from '../composables/useToast'
import { getUserFriendlyErrorMessage, getErrorMessage } from '../utils/errorMessages'
import { logger } from '../utils/logger'

export const usePlaylistsStore = defineStore('playlists', () => {
  const toast = useToast()
  const playlists = ref<Playlist[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentPlaylist = ref<Playlist | null>(null)

  const hasPlaylists = computed(() => playlists.value.length > 0)
  const playlistsCount = computed(() => playlists.value.length)

  // 计算属性：所有播放列表中的视频 bvid 集合（用于快速查找）
  const allPlaylistBvids = computed(() => {
    const set = new Set<string>()
    playlists.value.forEach((playlist) => {
      playlist.videos.forEach((video) => {
        set.add(video.bvid)
      })
    })
    return set
  })

  // 检查视频是否存在于任意播放列表中
  function isVideoInAnyPlaylist(bvid: string): boolean {
    return allPlaylistBvids.value.has(bvid)
  }

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
      return playlist
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '创建播放列表失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to create playlist:', e)
      return null
    }
  }

  async function updatePlaylist(
    id: string,
    updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover'>>
  ): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.updatePlaylist(id, updates)
      if (result) {
        const index = playlists.value.findIndex((p) => p.id === id)
        if (index !== -1) {
          playlists.value[index] = result
        }
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
        playlists.value = playlists.value.filter((p) => p.id !== id)
        if (currentPlaylist.value?.id === id) {
          currentPlaylist.value = null
        }
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
        const playlist = playlists.value.find((p) => p.id === playlistId)
        if (playlist) {
          playlist.videos = playlist.videos.filter((v) => v.bvid !== bvid)
          playlist.updatedAt = Date.now()
        }
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
    return playlists.value.find((p) => p.id === id)
  }

  return {
    playlists,
    isLoading,
    error,
    currentPlaylist,
    hasPlaylists,
    playlistsCount,
    allPlaylistBvids,
    isVideoInAnyPlaylist,
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
