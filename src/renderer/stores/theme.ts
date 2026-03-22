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
    description: 'Warm ember gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(16% 0.02 30)',
      bgSecondary: 'oklch(20% 0.025 30)',
      bgCard: 'oklch(24% 0.03 30)',
      bgElevated: 'oklch(28% 0.035 30)',
      bgOverlay: 'color-mix(in oklch, #000 60%, transparent)',
      textPrimary: 'oklch(96% 0.01 30)',
      textSecondary: 'oklch(72% 0.02 30)',
      textSecondaryStrong: 'oklch(82% 0.02 30)',
      textTertiary: 'oklch(55% 0.02 30)',
      accent: 'oklch(68% 0.18 35)',
      accentHover: 'oklch(74% 0.17 35)',
      accentMuted: 'color-mix(in oklch, oklch(68% 0.18 35) 18%, transparent)',
      border: 'oklch(30% 0.02 30)',
      borderSubtle: 'oklch(24% 0.02 30)',
      success: 'oklch(68% 0.12 160)',
      warning: 'oklch(75% 0.12 80)',
      error: 'oklch(62% 0.19 25)',
      glow: 'color-mix(in oklch, oklch(68% 0.18 35) 30%, transparent)'
    },
    effects: {
      bgGradient:
        'linear-gradient(135deg, oklch(16% 0.02 30) 0%, oklch(20% 0.03 30) 50%, oklch(22% 0.035 30) 100%)'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep teal gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(15% 0.02 220)',
      bgSecondary: 'oklch(19% 0.024 220)',
      bgCard: 'oklch(23% 0.028 220)',
      bgElevated: 'oklch(27% 0.03 220)',
      bgOverlay: 'color-mix(in oklch, #000 60%, transparent)',
      textPrimary: 'oklch(94% 0.01 220)',
      textSecondary: 'oklch(70% 0.015 220)',
      textSecondaryStrong: 'oklch(80% 0.015 220)',
      textTertiary: 'oklch(52% 0.015 220)',
      accent: 'oklch(64% 0.12 190)',
      accentHover: 'oklch(70% 0.12 190)',
      accentMuted: 'color-mix(in oklch, oklch(64% 0.12 190) 18%, transparent)',
      border: 'oklch(30% 0.02 220)',
      borderSubtle: 'oklch(24% 0.02 220)',
      success: 'oklch(66% 0.11 170)',
      warning: 'oklch(76% 0.12 85)',
      error: 'oklch(62% 0.18 25)',
      glow: 'color-mix(in oklch, oklch(64% 0.12 190) 30%, transparent)'
    },
    effects: {
      bgGradient:
        'linear-gradient(180deg, oklch(15% 0.02 220) 0%, oklch(19% 0.024 220) 50%, oklch(23% 0.028 220) 100%)'
    }
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted slate glass theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(16% 0.015 250)',
      bgSecondary: 'oklch(18% 0.015 250 / 0.78)',
      bgCard: 'oklch(20% 0.02 250 / 0.68)',
      bgElevated: 'oklch(22% 0.02 250 / 0.6)',
      bgOverlay: 'color-mix(in oklch, #000 60%, transparent)',
      textPrimary: 'oklch(96% 0.01 250)',
      textSecondary: 'oklch(72% 0.015 250)',
      textSecondaryStrong: 'oklch(82% 0.015 250)',
      textTertiary: 'oklch(56% 0.015 250)',
      accent: 'oklch(64% 0.16 25)',
      accentHover: 'oklch(70% 0.16 25)',
      accentMuted: 'color-mix(in oklch, oklch(64% 0.16 25) 18%, transparent)',
      border: 'color-mix(in oklch, oklch(92% 0.01 250) 12%, transparent)',
      borderSubtle: 'color-mix(in oklch, oklch(92% 0.01 250) 8%, transparent)',
      success: 'oklch(68% 0.12 160)',
      warning: 'oklch(75% 0.12 80)',
      error: 'oklch(62% 0.19 25)',
      glow: 'color-mix(in oklch, oklch(64% 0.16 25) 28%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(18% 0.015 250 / 0.78) 90%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(92% 0.01 250) 12%, transparent)'
    },
    effects: {
      glassEffect: true,
      glassBlur: '20px',
      glassOpacity: 0.82
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

    if (theme.id === 'dark') {
      root.style.setProperty('--accent-rose', '#ed7478')
      root.style.setProperty('--accent-blush', '#f2a1a4')
      root.style.setProperty('--accent-lilac', '#ca91a1')
      root.style.setProperty('--accent-violet', '#b8758b')
      root.style.setProperty('--accent-sky', '#8da6c6')
      root.style.setProperty('--accent-amber', '#efa347')
      root.style.setProperty('--accent-mint', '#52b89a')
    }

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

  function loadFromStorage(initialThemeId?: string) {
    try {
      const savedCustomThemes = localStorage.getItem('blipod-custom-themes')
      if (savedCustomThemes) {
        customThemes.value = JSON.parse(savedCustomThemes)
      }

      const savedThemeId = localStorage.getItem('blipod-theme')
      const preferredThemeId = [initialThemeId, savedThemeId, 'dark'].find(
        (themeId): themeId is string => Boolean(themeId && allThemes.value.find((t) => t.id === themeId))
      )

      if (preferredThemeId) {
        setTheme(preferredThemeId)
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
      setTheme(initialThemeId && allThemes.value.find((t) => t.id === initialThemeId) ? initialThemeId : 'dark')
    }
  }

  function initTheme(initialThemeId?: string) {
    loadFromStorage(initialThemeId)
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
