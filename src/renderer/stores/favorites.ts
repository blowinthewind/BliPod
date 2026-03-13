import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FavoriteVideo, ExtractedVideo } from '../../preload/preload'

export const useFavoritesStore = defineStore('favorites', () => {
  const favorites = ref<FavoriteVideo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasFavorites = computed(() => favorites.value.length > 0)
  const favoritesCount = computed(() => favorites.value.length)

  async function loadFavorites() {
    isLoading.value = true
    error.value = null
    try {
      favorites.value = await window.electronAPI.store.getFavorites()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load favorites'
    } finally {
      isLoading.value = false
    }
  }

  async function addFavorite(video: ExtractedVideo): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.addFavorite(video)
      if (result) {
        await loadFavorites()
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add favorite'
      return false
    }
  }

  async function removeFavorite(bvid: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.removeFavorite(bvid)
      if (result) {
        favorites.value = favorites.value.filter(f => f.bvid !== bvid)
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove favorite'
      return false
    }
  }

  async function isFavorite(bvid: string): Promise<boolean> {
    try {
      return await window.electronAPI.store.isFavorite(bvid)
    } catch {
      return false
    }
  }

  function isFavoriteSync(bvid: string): boolean {
    return favorites.value.some(f => f.bvid === bvid)
  }

  return {
    favorites,
    isLoading,
    error,
    hasFavorites,
    favoritesCount,
    loadFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    isFavoriteSync
  }
})
