import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_THEME_ID, builtInThemes, type Theme, type ThemeColors, type ThemeEffects } from '../../shared/theme'

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
  accentRose: '--accent-rose',
  accentBlush: '--accent-blush',
  accentLilac: '--accent-lilac',
  accentViolet: '--accent-violet',
  accentSky: '--accent-sky',
  accentAmber: '--accent-amber',
  accentMint: '--accent-mint',
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

export interface ThemeStateSnapshot {
  currentThemeId: string
  customThemes: Theme[]
}

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<string>(DEFAULT_THEME_ID)
  const customThemes = ref<Theme[]>([])

  const allThemes = computed<Theme[]>(() => [...builtInThemes, ...customThemes.value])

  const currentTheme = computed<Theme | undefined>(() =>
    allThemes.value.find((t) => t.id === currentThemeId.value)
  )

  function cloneTheme(theme: Theme): Theme {
    return {
      ...theme,
      colors: { ...theme.colors },
      effects: theme.effects ? { ...theme.effects } : undefined
    }
  }

  function normalizeCustomTheme(theme: Theme): Theme {
    return {
      ...cloneTheme(theme),
      isBuiltIn: false
    }
  }

  function getThemeState(): ThemeStateSnapshot {
    return {
      currentThemeId: currentThemeId.value,
      customThemes: customThemes.value.map(normalizeCustomTheme)
    }
  }

  function findTheme(themeId: string): Theme | undefined {
    return allThemes.value.find((t) => t.id === themeId)
  }

  function getFallbackTheme(): Theme {
    return builtInThemes.find((t) => t.id === DEFAULT_THEME_ID) ?? builtInThemes[0]
  }

  function applyResolvedTheme(preferredThemeId?: string): Theme {
    const theme = (preferredThemeId && findTheme(preferredThemeId)) || getFallbackTheme()
    currentThemeId.value = theme.id
    applyTheme(theme)
    return theme
  }

  function setTheme(themeId: string): ThemeStateSnapshot | null {
    const theme = findTheme(themeId)
    if (!theme) {
      return null
    }

    currentThemeId.value = theme.id
    applyTheme(theme)
    return getThemeState()
  }

  function applyTheme(theme: Theme) {
    const root = document.documentElement

    root.setAttribute('data-theme', theme.id)

    Object.entries(CSS_VAR_MAP).forEach(([key, cssVar]) => {
      const value = theme.colors[key as keyof ThemeColors]
      if (value !== undefined) {
        root.style.setProperty(cssVar, value)
      } else {
        root.style.removeProperty(cssVar)
      }
    })

    Object.entries(EFFECTS_VAR_MAP).forEach(([key, cssVar]) => {
      const value = theme.effects?.[key as keyof ThemeEffects]
      if (value === undefined) {
        root.style.removeProperty(cssVar)
      } else if (typeof value === 'boolean') {
        root.style.setProperty(cssVar, value ? '1' : '0')
      } else {
        root.style.setProperty(cssVar, String(value))
      }
    })

    applyBodyStyles(theme)
  }

  function applyBodyStyles(theme: Theme) {
    const body = document.body

    if (theme.effects?.bgGradient) {
      body.style.background = theme.effects.bgGradient
      body.style.backgroundSize = ''
      body.style.backgroundAttachment = ''
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
      body.style.backgroundSize = ''
      body.style.backgroundAttachment = ''
    }

    if (theme.effects?.bgBlur) {
      body.style.backdropFilter = `blur(${theme.effects.bgBlur})`
    } else {
      body.style.backdropFilter = ''
    }
  }

  function syncFromSettings(settings: ThemeStateSnapshot): ThemeStateSnapshot {
    customThemes.value = settings.customThemes.map(normalizeCustomTheme)
    applyResolvedTheme(settings.currentThemeId)
    return getThemeState()
  }

  function addCustomTheme(theme: Theme): ThemeStateSnapshot | null {
    const existing = findTheme(theme.id)
    if (existing) {
      console.warn(`Theme with id "${theme.id}" already exists`)
      return null
    }

    customThemes.value = [...customThemes.value, normalizeCustomTheme(theme)]
    return getThemeState()
  }

  function removeCustomTheme(themeId: string): ThemeStateSnapshot | null {
    const exists = customThemes.value.some((t) => t.id === themeId)
    if (!exists) {
      return null
    }

    customThemes.value = customThemes.value.filter((t) => t.id !== themeId)
    if (currentThemeId.value === themeId) {
      applyResolvedTheme(DEFAULT_THEME_ID)
    }

    return getThemeState()
  }

  function updateCustomTheme(themeId: string, updates: Partial<Theme>): ThemeStateSnapshot | null {
    let updated = false

    customThemes.value = customThemes.value.map((theme) => {
      if (theme.id !== themeId) {
        return theme
      }

      updated = true
      return normalizeCustomTheme({
        ...theme,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        colors: updates.colors ? { ...theme.colors, ...updates.colors } : theme.colors,
        effects:
          updates.effects !== undefined ? { ...(theme.effects ?? {}), ...updates.effects } : theme.effects
      })
    })

    if (!updated) {
      return null
    }

    if (currentThemeId.value === themeId) {
      applyResolvedTheme(themeId)
    }

    return getThemeState()
  }

  function initTheme(settings: ThemeStateSnapshot = { currentThemeId: DEFAULT_THEME_ID, customThemes: [] }) {
    return syncFromSettings(settings)
  }

  function resetToDefault(): ThemeStateSnapshot {
    customThemes.value = []
    applyResolvedTheme(DEFAULT_THEME_ID)
    return getThemeState()
  }

  function duplicateTheme(themeId: string, newId: string, newName: string): ThemeStateSnapshot | null {
    const source = findTheme(themeId)
    if (!source) {
      return null
    }

    return addCustomTheme({
      id: newId,
      name: newName,
      description: `Copy of ${source.name}`,
      colors: { ...source.colors },
      effects: source.effects ? { ...source.effects } : undefined
    })
  }

  return {
    currentThemeId,
    currentTheme,
    allThemes,
    builtInThemes,
    customThemes,
    setTheme,
    syncFromSettings,
    addCustomTheme,
    removeCustomTheme,
    updateCustomTheme,
    duplicateTheme,
    initTheme,
    resetToDefault
  }
})

