import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  bgElevated: string
  textPrimary: string
  textSecondary: string
  accent: string
  accentHover: string
  border: string
  success?: string
  warning?: string
  error?: string
}

export interface Theme {
  id: string
  name: string
  description?: string
  colors: ThemeColors
  isBuiltIn?: boolean
}

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  bgCard: '--bg-card',
  bgElevated: '--bg-elevated',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  accent: '--accent',
  accentHover: '--accent-hover',
  border: '--border',
  success: '--success',
  warning: '--warning',
  error: '--error'
}

const builtInThemes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Classic dark theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#0d0d0d',
      bgSecondary: '#141414',
      bgCard: '#1a1a1a',
      bgElevated: '#242424',
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: '#2d2d2d',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      bgCard: '#ebebeb',
      bgElevated: '#e0e0e0',
      textPrimary: '#1a1a1a',
      textSecondary: '#666666',
      accent: '#e94560',
      accentHover: '#d63850',
      border: '#d9d9d9',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'colorful',
    name: 'Colorful',
    description: 'Vibrant purple-blue theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16213e',
      bgCard: '#0f3460',
      bgElevated: '#1a4a7a',
      textPrimary: '#eaeaea',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: '#2d2d44',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  }
]

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<string>('dark')
  const customThemes = ref<Theme[]>([])
  
  const allThemes = computed<Theme[]>(() => [...builtInThemes, ...customThemes.value])
  
  const currentTheme = computed<Theme | undefined>(() => 
    allThemes.value.find(t => t.id === currentThemeId.value)
  )

  function setTheme(themeId: string) {
    const theme = allThemes.value.find(t => t.id === themeId)
    if (theme) {
      currentThemeId.value = themeId
      applyTheme(theme)
      saveThemeToStorage(themeId)
    }
  }

  function applyTheme(theme: Theme) {
    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (value && CSS_VAR_MAP[key as keyof ThemeColors]) {
        root.style.setProperty(CSS_VAR_MAP[key as keyof ThemeColors], value)
      }
    })
  }

  function addCustomTheme(theme: Theme) {
    const existing = allThemes.value.find(t => t.id === theme.id)
    if (existing) {
      console.warn(`Theme with id "${theme.id}" already exists`)
      return false
    }
    customThemes.value.push({ ...theme, isBuiltIn: false })
    saveCustomThemesToStorage()
    return true
  }

  function removeCustomTheme(themeId: string) {
    const index = customThemes.value.findIndex(t => t.id === themeId)
    if (index !== -1) {
      customThemes.value.splice(index, 1)
      saveCustomThemesToStorage()
      if (currentThemeId.value === themeId) {
        setTheme('dark')
      }
      return true
    }
    return false
  }

  function updateCustomTheme(themeId: string, updates: Partial<Theme>) {
    const theme = customThemes.value.find(t => t.id === themeId)
    if (theme) {
      Object.assign(theme, updates)
      saveCustomThemesToStorage()
      if (currentThemeId.value === themeId) {
        applyTheme(theme)
      }
      return true
    }
    return false
  }

  function saveThemeToStorage(themeId: string) {
    try {
      localStorage.setItem('blipod-theme', themeId)
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e)
    }
  }

  function saveCustomThemesToStorage() {
    try {
      localStorage.setItem('blipod-custom-themes', JSON.stringify(customThemes.value))
    } catch (e) {
      console.warn('Failed to save custom themes:', e)
    }
  }

  function loadFromStorage() {
    try {
      const savedThemeId = localStorage.getItem('blipod-theme')
      if (savedThemeId && allThemes.value.find(t => t.id === savedThemeId)) {
        setTheme(savedThemeId)
      }
      
      const savedCustomThemes = localStorage.getItem('blipod-custom-themes')
      if (savedCustomThemes) {
        customThemes.value = JSON.parse(savedCustomThemes)
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }
  }

  function initTheme() {
    loadFromStorage()
  }

  function resetToDefault() {
    setTheme('dark')
    customThemes.value = []
    localStorage.removeItem('blipod-custom-themes')
  }

  return {
    currentThemeId,
    currentTheme,
    allThemes,
    builtInThemes,
    customThemes,
    setTheme,
    addCustomTheme,
    removeCustomTheme,
    updateCustomTheme,
    initTheme,
    resetToDefault
  }
})
