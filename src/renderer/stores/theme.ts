import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  bgElevated: string
  bgOverlay?: string
  textPrimary: string
  textSecondary: string
  textSecondaryStrong?: string
  textTertiary?: string
  accent: string
  accentHover: string
  accentMuted?: string
  border: string
  borderSubtle?: string
  success?: string
  warning?: string
  error?: string
  glow?: string
  glassBg?: string
  glassBorder?: string
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
  bgOverlay: '--bg-overlay',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textSecondaryStrong: '--text-secondary-strong',
  textTertiary: '--text-tertiary',
  accent: '--accent',
  accentHover: '--accent-hover',
  accentMuted: '--accent-muted',
  border: '--border',
  borderSubtle: '--border-subtle',
  success: '--success',
  warning: '--warning',
  error: '--error',
  glow: '--glow',
  glassBg: '--glass-bg',
  glassBorder: '--glass-border'
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
      bgPrimary: '#0b0c0e',
      bgSecondary: '#121318',
      bgCard: '#171922',
      bgElevated: '#1d202b',
      bgOverlay: 'rgba(0, 0, 0, 0.6)',
      textPrimary: '#f2f3f5',
      textSecondary: '#a1a7b3',
      textSecondaryStrong: '#c3c7d1',
      textTertiary: '#6a6f7b',
      accent: '#e05a5f',
      accentHover: '#ef6c71',
      accentMuted: 'rgba(224, 90, 95, 0.16)',
      border: '#232633',
      borderSubtle: '#1b1e29',
      success: '#2aa784',
      warning: '#d48a2e',
      error: '#de4c4c',
      glow: 'rgba(224, 90, 95, 0.25)',
      glassBg: 'rgba(18, 19, 24, 0.82)',
      glassBorder: 'rgba(255, 255, 255, 0.08)'
    }
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: '#f6f5f2',
      bgSecondary: '#eeece7',
      bgCard: '#ffffff',
      bgElevated: '#ffffff',
      bgOverlay: 'rgba(21, 23, 28, 0.35)',
      textPrimary: '#1b1e25',
      textSecondary: '#5f6673',
      textSecondaryStrong: '#495060',
      textTertiary: '#9aa2b1',
      accent: '#cc3944',
      accentHover: '#b8323d',
      accentMuted: 'rgba(204, 57, 68, 0.12)',
      border: '#d9d6cf',
      borderSubtle: '#efede8',
      success: '#1f9a78',
      warning: '#c67b25',
      error: '#c63a3a',
      glow: 'rgba(204, 57, 68, 0.16)',
      glassBg: 'rgba(255, 255, 255, 0.88)',
      glassBorder: 'rgba(24, 28, 36, 0.08)'
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
      bgOverlay: 'rgba(0, 0, 0, 0.6)',
      textPrimary: '#fff5f5',
      textSecondary: '#d4a5a5',
      textSecondaryStrong: '#e8bcbc',
      textTertiary: '#b08181',
      accent: '#ff6b35',
      accentHover: '#ff8c5a',
      accentMuted: 'rgba(255, 107, 53, 0.18)',
      border: '#4a3030',
      borderSubtle: '#3a2424',
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
      bgOverlay: 'rgba(0, 0, 0, 0.6)',
      textPrimary: '#ccd6f6',
      textSecondary: '#8892b0',
      textSecondaryStrong: '#a5afc8',
      textTertiary: '#6c7691',
      accent: '#64ffda',
      accentHover: '#7fffd4',
      accentMuted: 'rgba(100, 255, 218, 0.15)',
      border: '#233554',
      borderSubtle: '#1a2a45',
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
      bgOverlay: 'rgba(0,  0, 0, 0.6)',
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      textSecondaryStrong: '#c2c2c2',
      textTertiary: '#7d7d88',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      accentMuted: 'rgba(233, 69, 96, 0.15)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
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
    allThemes.value.find((t) => t.id === currentThemeId.value)
  )

  function setTheme(themeId: string) {
    const theme = allThemes.value.find((t) => t.id === themeId)
    if (theme) {
      currentThemeId.value = themeId
      applyTheme(theme)
      saveThemeToStorage(themeId)
    }
  }

  function applyTheme(theme: Theme) {
    const root = document.documentElement

    root.setAttribute('data-theme', theme.id === 'light' ? 'light' : 'dark')

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
    const existing = allThemes.value.find((t) => t.id === theme.id)
    if (existing) {
      console.warn(`Theme with id "${theme.id}" already exists`)
      return false
    }
    customThemes.value.push({ ...theme, isBuiltIn: false })
    saveCustomThemesToStorage()
    return true
  }

  function removeCustomTheme(themeId: string) {
    const index = customThemes.value.findIndex((t) => t.id === themeId)
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
    const theme = customThemes.value.find((t) => t.id === themeId)
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
      if (savedThemeId && allThemes.value.find((t) => t.id === savedThemeId)) {
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
    const source = allThemes.value.find((t) => t.id === themeId)
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
