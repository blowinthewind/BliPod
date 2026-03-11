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

export interface ThemeEffects {
  bgGradient?: string
  bgImage?: string
  bgImageOpacity?: number
  bgBlur?: string
  glassEffect?: boolean
  glassBlur?: string
  glassOpacity?: number
}

export interface Theme {
  id: string
  name: string
  description?: string
  colors: ThemeColors
  effects?: ThemeEffects
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

const EFFECTS_VAR_MAP: Record<keyof ThemeEffects, string> = {
  bgGradient: '--bg-gradient',
  bgImage: '--bg-image',
  bgImageOpacity: '--bg-image-opacity',
  bgBlur: '--bg-blur',
  glassEffect: '--glass-effect',
  glassBlur: '--glass-blur',
  glassOpacity: '--glass-opacity'
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
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#1a1a1a',
      bgSecondary: '#2d1f1f',
      bgCard: '#3d2a2a',
      bgElevated: '#4d3535',
      textPrimary: '#fff5f5',
      textSecondary: '#d4a5a5',
      accent: '#ff6b35',
      accentHover: '#ff8c5a',
      border: '#4a3030',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    effects: {
      bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 50%, #3d1a1a 100%)'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#0a192f',
      bgSecondary: '#112240',
      bgCard: '#1d3557',
      bgElevated: '#264653',
      textPrimary: '#ccd6f6',
      textSecondary: '#8892b0',
      accent: '#64ffda',
      accentHover: '#7fffd4',
      border: '#233554',
      success: '#64ffda',
      warning: '#ffd93d',
      error: '#ff6b6b'
    },
    effects: {
      bgGradient: 'linear-gradient(180deg, #0a192f 0%, #112240 50%, #1d3557 100%)'
    }
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted glass effect theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: 'rgba(26, 26, 46, 0.8)',
      bgCard: 'rgba(15, 52, 96, 0.6)',
      bgElevated: 'rgba(26, 74, 122, 0.5)',
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    effects: {
      glassEffect: true,
      glassBlur: '20px',
      glassOpacity: 0.8
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
    
    if (theme.effects) {
      Object.entries(theme.effects).forEach(([key, value]) => {
        if (value !== undefined && EFFECTS_VAR_MAP[key as keyof ThemeEffects]) {
          const cssVar = EFFECTS_VAR_MAP[key as keyof ThemeEffects]
          if (typeof value === 'boolean') {
            root.style.setProperty(cssVar, value ? '1' : '0')
          } else {
            root.style.setProperty(cssVar, String(value))
          }
        }
      })
    }
    
    applyBodyStyles(theme)
  }

  function applyBodyStyles(theme: Theme) {
    const body = document.body
    
    if (theme.effects?.bgGradient) {
      body.style.background = theme.effects.bgGradient
    } else if (theme.effects?.bgImage) {
      const opacity = theme.effects.bgImageOpacity ?? 1
      body.style.background = `
        linear-gradient(rgba(0, 0, 0, ${1 - opacity}), rgba(0, 0, 0, ${1 - opacity})),
        url('${theme.effects.bgImage}')
      `
      body.style.backgroundSize = 'cover'
      body.style.backgroundAttachment = 'fixed'
    } else {
      body.style.background = theme.colors.bgPrimary
    }
    
    if (theme.effects?.bgBlur) {
      body.style.backdropFilter = `blur(${theme.effects.bgBlur})`
    } else {
      body.style.backdropFilter = ''
    }
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
      if (updates.colors) {
        theme.colors = { ...theme.colors, ...updates.colors }
      }
      if (updates.effects) {
        theme.effects = { ...theme.effects, ...updates.effects }
      }
      if (updates.name) theme.name = updates.name
      if (updates.description) theme.description = updates.description
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

  function duplicateTheme(themeId: string, newId: string, newName: string) {
    const source = allThemes.value.find(t => t.id === themeId)
    if (source) {
      return addCustomTheme({
        id: newId,
        name: newName,
        description: `Copy of ${source.name}`,
        colors: { ...source.colors },
        effects: source.effects ? { ...source.effects } : undefined
      })
    }
    return false
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
    duplicateTheme,
    initTheme,
    resetToDefault
  }
})
