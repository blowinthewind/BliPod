import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FavoriteVideo, ExtractedVideo } from '../../preload/preload'
import { useToast } from '../composables/useToast'
import { getUserFriendlyErrorMessage, getErrorMessage } from '../utils/errorMessages'
import { logger } from '../utils/logger'

export const useFavoritesStore = defineStore('favorites', () => {
  const toast = useToast()
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
      const friendlyError = getUserFriendlyErrorMessage(e, '加载收藏失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to load favorites:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addFavorite(video: ExtractedVideo): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.addFavorite(video)
      if (result) {
        await loadFavorites()
      } else {
        toast.error(getErrorMessage('favorite'))
      }
      return result
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '添加收藏失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to add favorite:', e)
      return false
    }
  }

  async function removeFavorite(bvid: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.store.removeFavorite(bvid)
      if (result) {
        favorites.value = favorites.value.filter((f) => f.bvid !== bvid)
      } else {
        toast.error(getErrorMessage('unfavorite'))
      }
      return result
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '移除收藏失败')
      error.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to remove favorite:', e)
      return false
    }
  }

  async function isFavorite(bvid: string): Promise<boolean> {
    try {
      return await window.electronAPI.store.isFavorite(bvid)
    } catch (e) {
      logger.warn('Failed to check favorite status:', e)
      return false
    }
  }

  function isFavoriteSync(bvid: string): boolean {
    return favorites.value.some((f) => f.bvid === bvid)
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
