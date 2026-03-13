import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings, AppStore } from '../../preload/preload'

export const useAppSettingsStore = defineStore('appSettings', () => {
  const settings = ref<AppSettings>({
    volume: 80,
    autoPlay: true,
    rememberPosition: true,
    currentThemeId: 'dark'
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const volume = computed(() => settings.value.volume)
  const autoPlay = computed(() => settings.value.autoPlay)
  const rememberPosition = computed(() => settings.value.rememberPosition)
  const currentThemeId = computed(() => settings.value.currentThemeId)

  async function loadSettings() {
    isLoading.value = true
    error.value = null
    try {
      settings.value = await window.electronAPI.store.getSettings()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load settings'
    } finally {
      isLoading.value = false
    }
  }

  async function updateSettings(updates: Partial<AppSettings>): Promise<boolean> {
    try {
      settings.value = await window.electronAPI.store.updateSettings(updates)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update settings'
      return false
    }
  }

  async function setVolume(value: number) {
    await updateSettings({ volume: Math.max(0, Math.min(100, value)) })
  }

  async function setAutoPlay(value: boolean) {
    await updateSettings({ autoPlay: value })
  }

  async function setRememberPosition(value: boolean) {
    await updateSettings({ rememberPosition: value })
  }

  async function setCurrentThemeId(themeId: string) {
    await updateSettings({ currentThemeId: themeId })
  }

  async function exportData(): Promise<AppStore | null> {
    try {
      return await window.electronAPI.store.exportData()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to export data'
      return null
    }
  }

  async function importData(data: Partial<AppStore>): Promise<boolean> {
    try {
      await window.electronAPI.store.importData(data)
      await loadSettings()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to import data'
      return false
    }
  }

  return {
    settings,
    isLoading,
    error,
    volume,
    autoPlay,
    rememberPosition,
    currentThemeId,
    loadSettings,
    updateSettings,
    setVolume,
    setAutoPlay,
    setRememberPosition,
    setCurrentThemeId,
    exportData,
    importData
  }
})
