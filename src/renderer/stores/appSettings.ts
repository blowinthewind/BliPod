import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings, AppStore } from '../../preload/preload'
import { DEFAULT_THEME_ID, cloneTheme, findTheme, normalizeCustomTheme, resolveThemeId, type Theme } from '../../shared/theme'

export const useAppSettingsStore = defineStore('appSettings', () => {
  const settings = ref<AppSettings>({
    autoPlay: true,
    rememberPosition: true,
    currentThemeId: DEFAULT_THEME_ID,
    customThemes: []
  })
  const lastVolume = ref(80)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const autoPlay = computed(() => settings.value.autoPlay)
  const rememberPosition = computed(() => settings.value.rememberPosition)
  const currentThemeId = computed(() => settings.value.currentThemeId)
  const customThemes = computed(() => settings.value.customThemes)

  async function loadSettings() {
    isLoading.value = true
    error.value = null
    try {
      settings.value = await window.electronAPI.store.getSettings()
      lastVolume.value = await window.electronAPI.store.getLastVolume()
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

  async function setAutoPlay(value: boolean) {
    await updateSettings({ autoPlay: value })
  }

  async function setRememberPosition(value: boolean) {
    await updateSettings({ rememberPosition: value })
  }

  async function setCurrentThemeId(themeId: string) {
    await updateSettings({ currentThemeId: resolveThemeId(themeId, settings.value.customThemes) })
  }

  async function setCustomThemes(themes: Theme[]) {
    const nextThemes = themes.map(normalizeCustomTheme)
    await updateSettings({
      customThemes: nextThemes,
      currentThemeId: resolveThemeId(settings.value.currentThemeId, nextThemes)
    })
  }

  async function addCustomTheme(theme: Theme) {
    if (findTheme(theme.id, settings.value.customThemes)) {
      return false
    }

    const nextThemes = [...settings.value.customThemes, normalizeCustomTheme(theme)]
    return updateSettings({ customThemes: nextThemes })
  }

  async function updateCustomTheme(themeId: string, updates: Partial<Theme>) {
    const index = settings.value.customThemes.findIndex((theme) => theme.id === themeId)
    if (index === -1) {
      return false
    }

    const current = settings.value.customThemes[index]
    const nextTheme = normalizeCustomTheme({
      ...current,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      colors: updates.colors ? { ...current.colors, ...updates.colors } : current.colors,
      effects: updates.effects !== undefined ? { ...(current.effects ?? {}), ...updates.effects } : current.effects
    })

    const nextThemes = [...settings.value.customThemes]
    nextThemes[index] = nextTheme

    return updateSettings({
      customThemes: nextThemes,
      currentThemeId: resolveThemeId(settings.value.currentThemeId, nextThemes)
    })
  }

  async function removeCustomTheme(themeId: string) {
    const nextThemes = settings.value.customThemes.filter((theme) => theme.id !== themeId)
    if (nextThemes.length === settings.value.customThemes.length) {
      return false
    }

    return updateSettings({
      customThemes: nextThemes,
      currentThemeId: resolveThemeId(settings.value.currentThemeId, nextThemes)
    })
  }

  async function duplicateTheme(themeId: string, newId: string, newName: string) {
    const source = findTheme(themeId, settings.value.customThemes)
    if (!source || findTheme(newId, settings.value.customThemes)) {
      return false
    }

    const nextThemes = [
      ...settings.value.customThemes,
      normalizeCustomTheme({
        ...cloneTheme(source),
        id: newId,
        name: newName,
        description: `Copy of ${source.name}`
      })
    ]

    return updateSettings({ customThemes: nextThemes })
  }

  async function resetThemeSettings() {
    return updateSettings({
      currentThemeId: DEFAULT_THEME_ID,
      customThemes: []
    })
  }

  async function setLastVolume(value: number) {
    const clampedValue = Math.max(0, Math.min(100, value))
    lastVolume.value = clampedValue
    await window.electronAPI.store.setLastVolume(clampedValue)
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
    lastVolume,
    isLoading,
    error,
    autoPlay,
    rememberPosition,
    currentThemeId,
    customThemes,
    loadSettings,
    updateSettings,
    setAutoPlay,
    setRememberPosition,
    setCurrentThemeId,
    setCustomThemes,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
    duplicateTheme,
    resetThemeSettings,
    setLastVolume,
    exportData,
    importData
  }
})

