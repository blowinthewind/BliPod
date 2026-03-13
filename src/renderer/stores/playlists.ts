import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Playlist, ExtractedVideo } from '../../preload/preload'

export const usePlaylistsStore = defineStore('playlists', () => {
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
      error.value = e instanceof Error ? e.message : 'Failed to load playlists'
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
      error.value = e instanceof Error ? e.message : 'Failed to create playlist'
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
      }
      return result !== null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update playlist'
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
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete playlist'
      return false
    }
  }

  async function addVideoToPlaylist(playlistId: string, video: ExtractedVideo): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.addVideoToPlaylist(playlistId, video)
      if (result) {
        await loadPlaylists()
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add video to playlist'
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
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove video from playlist'
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
