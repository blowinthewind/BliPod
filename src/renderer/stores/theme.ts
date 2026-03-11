import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeId = 'dark' | 'light' | 'colorful'

export interface Theme {
  id: ThemeId
  name: string
  colors: {
    bgPrimary: string
    bgSecondary: string
    bgCard: string
    bgElevated: string
    textPrimary: string
    textSecondary: string
    accent: string
    accentHover: string
    border: string
  }
}

export const themes: Record<ThemeId, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      bgPrimary: '#0d0d0d',
      bgSecondary: '#141414',
      bgCard: '#1a1a1a',
      bgElevated: '#242424',
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: '#2d2d2d'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      bgCard: '#ebebeb',
      bgElevated: '#e0e0e0',
      textPrimary: '#1a1a1a',
      textSecondary: '#666666',
      accent: '#e94560',
      accentHover: '#d63850',
      border: '#d9d9d9'
    }
  },
  colorful: {
    id: 'colorful',
    name: 'Colorful',
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16213e',
      bgCard: '#0f3460',
      bgElevated: '#1a4a7a',
      textPrimary: '#eaeaea',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: '#2d2d44'
    }
  }
}

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<ThemeId>('dark')
  const currentTheme = ref<Theme>(themes.dark)

  function setTheme(themeId: ThemeId) {
    if (themes[themeId]) {
      currentThemeId.value = themeId
      currentTheme.value = themes[themeId]
      applyTheme(themes[themeId])
      saveThemeToStorage(themeId)
    }
  }

  function applyTheme(theme: Theme) {
    const root = document.documentElement
    root.style.setProperty('--bg-primary', theme.colors.bgPrimary)
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary)
    root.style.setProperty('--bg-card', theme.colors.bgCard)
    root.style.setProperty('--bg-elevated', theme.colors.bgElevated)
    root.style.setProperty('--text-primary', theme.colors.textPrimary)
    root.style.setProperty('--text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--accent', theme.colors.accent)
    root.style.setProperty('--accent-hover', theme.colors.accentHover)
    root.style.setProperty('--border', theme.colors.border)
  }

  function saveThemeToStorage(themeId: ThemeId) {
    try {
      localStorage.setItem('blipod-theme', themeId)
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e)
    }
  }

  function loadThemeFromStorage() {
    try {
      const saved = localStorage.getItem('blipod-theme') as ThemeId | null
      if (saved && themes[saved]) {
        setTheme(saved)
      }
    } catch (e) {
      console.warn('Failed to load theme from localStorage:', e)
    }
  }

  function initTheme() {
    loadThemeFromStorage()
  }

  return {
    currentThemeId,
    currentTheme,
    themes,
    setTheme,
    initTheme
  }
})
