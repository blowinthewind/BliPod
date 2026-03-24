export const BUILT_IN_THEME_IDS = ['dark', 'light', 'sunset', 'ocean', 'glass'] as const

export type BuiltInThemeId = (typeof BUILT_IN_THEME_IDS)[number]

export const DEFAULT_THEME_ID: BuiltInThemeId = 'dark'

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
  accentRose?: string
  accentBlush?: string
  accentLilac?: string
  accentViolet?: string
  accentSky?: string
  accentAmber?: string
  accentMint?: string
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

export type ThemeColorKey = keyof ThemeColors
export type ThemeEffectKey = keyof ThemeEffects

export interface ThemeTokenField<TKey extends string> {
  key: TKey
  label: string
  input: 'color' | 'text' | 'number' | 'boolean'
  placeholder?: string
}

export interface ThemeTokenGroup<TKey extends string> {
  id: string
  label: string
  tokens: ThemeTokenField<TKey>[]
}

export const THEME_COLOR_GROUPS: ThemeTokenGroup<ThemeColorKey>[] = [
  {
    id: 'core-surface',
    label: '核心界面',
    tokens: [
      { key: 'bgPrimary', label: '主背景', input: 'color' },
      { key: 'bgSecondary', label: '侧边背景', input: 'color' },
      { key: 'bgCard', label: '卡片背景', input: 'color' },
      { key: 'bgElevated', label: '浮层背景', input: 'color' },
      { key: 'bgOverlay', label: '遮罩背景', input: 'color' },
      { key: 'textPrimary', label: '主文字', input: 'color' },
      { key: 'textSecondary', label: '次级文字', input: 'color' },
      { key: 'textSecondaryStrong', label: '强调次级文字', input: 'color' },
      { key: 'textTertiary', label: '弱化文字', input: 'color' },
      { key: 'border', label: '主边框', input: 'color' },
      { key: 'borderSubtle', label: '弱化边框', input: 'color' }
    ]
  },
  {
    id: 'accent-state',
    label: '主强调与状态',
    tokens: [
      { key: 'accent', label: '主强调色', input: 'color' },
      { key: 'accentHover', label: '强调悬浮色', input: 'color' },
      { key: 'accentMuted', label: '强调弱化色', input: 'color' },
      { key: 'success', label: '成功色', input: 'color' },
      { key: 'warning', label: '警告色', input: 'color' },
      { key: 'error', label: '错误色', input: 'color' }
    ]
  },
  {
    id: 'extended-visual',
    label: '扩展视觉',
    tokens: [
      { key: 'accentRose', label: '玫瑰强调色', input: 'color' },
      { key: 'accentBlush', label: '腮红强调色', input: 'color' },
      { key: 'accentLilac', label: '淡紫强调色', input: 'color' },
      { key: 'accentViolet', label: '紫罗兰强调色', input: 'color' },
      { key: 'accentSky', label: '天青强调色', input: 'color' },
      { key: 'accentAmber', label: '琥珀强调色', input: 'color' },
      { key: 'accentMint', label: '薄荷强调色', input: 'color' },
      { key: 'glow', label: '辉光色', input: 'color' },
      { key: 'glassBg', label: '玻璃背景', input: 'color' },
      { key: 'glassBorder', label: '玻璃边框', input: 'color' }
    ]
  }
]

export const THEME_EFFECT_GROUPS: ThemeTokenGroup<ThemeEffectKey>[] = [
  {
    id: 'effects',
    label: '效果',
    tokens: [
      {
        key: 'bgGradient',
        label: '背景渐变',
        input: 'text',
        placeholder: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)'
      },
      {
        key: 'bgImage',
        label: '背景图地址',
        input: 'text',
        placeholder: 'https://example.com/image.jpg'
      },
      { key: 'bgImageOpacity', label: '背景图透明度（0-1）', input: 'number', placeholder: '0.5' },
      { key: 'bgBlur', label: '背景模糊', input: 'text', placeholder: '10px' },
      { key: 'glassEffect', label: '启用玻璃效果', input: 'boolean' },
      { key: 'glassBlur', label: '玻璃模糊', input: 'text', placeholder: '20px' },
      { key: 'glassOpacity', label: '玻璃透明度（0-1）', input: 'number', placeholder: '0.8' }
    ]
  }
]

export const builtInThemes: Theme[] = [
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
      accent: '#c77852',
      accentHover: '#d68863',
      accentMuted: 'rgba(199, 120, 82, 0.16)',
      accentRose: '#d28365',
      accentBlush: '#e0b6a7',
      accentLilac: '#bb9790',
      accentViolet: '#a5817b',
      accentSky: '#8b98ab',
      accentAmber: '#c9944d',
      accentMint: '#6f9984',
      border: '#232633',
      borderSubtle: '#1b1e29',
      success: '#2c9b7d',
      warning: '#c28a38',
      error: '#d24a4a',
      glow: 'rgba(199, 120, 82, 0.22)',
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
      accent: '#b85f3e',
      accentHover: '#a75537',
      accentMuted: 'rgba(184, 95, 62, 0.12)',
      accentRose: '#bf7558',
      accentBlush: '#d9b6a6',
      accentLilac: '#b79c91',
      accentViolet: '#a3887f',
      accentSky: '#9a928b',
      accentAmber: '#ba864d',
      accentMint: '#869b8b',
      border: '#d9d6cf',
      borderSubtle: '#efede8',
      success: '#2a8d73',
      warning: '#b77b34',
      error: '#c84747',
      glow: 'rgba(184, 95, 62, 0.14)',
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
      accent: 'oklch(64% 0.13 38)',
      accentHover: 'oklch(69% 0.12 38)',
      accentMuted: 'color-mix(in oklch, oklch(64% 0.13 38) 18%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(64% 0.13 38) 82%, oklch(69% 0.07 30) 18%)',
      accentBlush: 'color-mix(in oklch, oklch(64% 0.13 38) 46%, oklch(84% 0.03 42) 54%)',
      accentLilac: 'color-mix(in oklch, oklch(64% 0.13 38) 58%, oklch(62% 0.03 18) 42%)',
      accentViolet: 'color-mix(in oklch, oklch(64% 0.13 38) 68%, oklch(57% 0.04 18) 32%)',
      accentSky: 'color-mix(in oklch, oklch(64% 0.13 38) 46%, oklch(63% 0.015 230) 54%)',
      accentAmber: 'color-mix(in oklch, oklch(64% 0.13 38) 80%, oklch(71% 0.07 72) 20%)',
      accentMint: 'color-mix(in oklch, oklch(64% 0.13 38) 42%, oklch(69% 0.03 160) 58%)',
      border: 'oklch(30% 0.02 30)',
      borderSubtle: 'oklch(24% 0.02 30)',
      success: 'oklch(66% 0.09 160)',
      warning: 'oklch(72% 0.09 80)',
      error: 'oklch(58% 0.16 24)',
      glow: 'color-mix(in oklch, oklch(64% 0.13 38) 24%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(24% 0.03 30) 88%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(96% 0.01 30) 10%, transparent)'
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
      accent: 'oklch(62% 0.1 192)',
      accentHover: 'oklch(67% 0.095 192)',
      accentMuted: 'color-mix(in oklch, oklch(62% 0.1 192) 18%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(62% 0.1 192) 78%, oklch(65% 0.05 35) 22%)',
      accentBlush: 'color-mix(in oklch, oklch(62% 0.1 192) 46%, oklch(82% 0.025 45) 54%)',
      accentLilac: 'color-mix(in oklch, oklch(62% 0.1 192) 54%, oklch(63% 0.03 248) 46%)',
      accentViolet: 'color-mix(in oklch, oklch(62% 0.1 192) 66%, oklch(57% 0.04 222) 34%)',
      accentSky: 'color-mix(in oklch, oklch(62% 0.1 192) 44%, oklch(72% 0.02 220) 56%)',
      accentAmber: 'color-mix(in oklch, oklch(62% 0.1 192) 72%, oklch(71% 0.07 72) 28%)',
      accentMint: 'color-mix(in oklch, oklch(62% 0.1 192) 52%, oklch(69% 0.035 162) 48%)',
      border: 'oklch(30% 0.02 220)',
      borderSubtle: 'oklch(24% 0.02 220)',
      success: 'oklch(65% 0.085 170)',
      warning: 'oklch(73% 0.09 82)',
      error: 'oklch(58% 0.16 24)',
      glow: 'color-mix(in oklch, oklch(62% 0.1 192) 24%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(23% 0.028 220) 88%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(94% 0.01 220) 10%, transparent)'
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
      bgPrimary: 'oklch(16% 0.012 250)',
      bgSecondary: 'oklch(18% 0.012 250 / 0.84)',
      bgCard: 'oklch(20% 0.015 250 / 0.76)',
      bgElevated: 'oklch(22% 0.016 250 / 0.7)',
      bgOverlay: 'color-mix(in oklch, #000 60%, transparent)',
      textPrimary: 'oklch(96% 0.008 250)',
      textSecondary: 'oklch(72% 0.012 250)',
      textSecondaryStrong: 'oklch(82% 0.012 250)',
      textTertiary: 'oklch(56% 0.012 250)',
      accent: 'oklch(63% 0.1 28)',
      accentHover: 'oklch(68% 0.095 28)',
      accentMuted: 'color-mix(in oklch, oklch(63% 0.1 28) 16%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(63% 0.1 28) 78%, oklch(66% 0.05 38) 22%)',
      accentBlush: 'color-mix(in oklch, oklch(63% 0.1 28) 40%, oklch(84% 0.025 42) 60%)',
      accentLilac: 'color-mix(in oklch, oklch(63% 0.1 28) 48%, oklch(70% 0.018 32) 52%)',
      accentViolet: 'color-mix(in oklch, oklch(63% 0.1 28) 60%, oklch(60% 0.03 32) 40%)',
      accentSky: 'color-mix(in oklch, oklch(63% 0.1 28) 34%, oklch(74% 0.01 230) 66%)',
      accentAmber: 'color-mix(in oklch, oklch(63% 0.1 28) 72%, oklch(71% 0.06 70) 28%)',
      accentMint: 'color-mix(in oklch, oklch(63% 0.1 28) 34%, oklch(72% 0.025 160) 66%)',
      border: 'color-mix(in oklch, oklch(92% 0.008 250) 14%, transparent)',
      borderSubtle: 'color-mix(in oklch, oklch(92% 0.008 250) 9%, transparent)',
      success: 'oklch(66% 0.085 160)',
      warning: 'oklch(73% 0.09 78)',
      error: 'oklch(58% 0.16 24)',
      glow: 'color-mix(in oklch, oklch(63% 0.1 28) 18%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(18% 0.012 250 / 0.84) 92%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(92% 0.008 250) 14%, transparent)'
    },
    effects: {
      glassEffect: true,
      glassBlur: '20px',
      glassOpacity: 0.82
    }
  }
]

export function cloneTheme(theme: Theme): Theme {
  return {
    ...theme,
    colors: { ...theme.colors },
    effects: theme.effects ? { ...theme.effects } : undefined
  }
}

export function normalizeCustomTheme(theme: Theme): Theme {
  return {
    ...cloneTheme(theme),
    isBuiltIn: false
  }
}

export function getAllThemes(customThemes: Theme[] = []): Theme[] {
  return [...builtInThemes, ...customThemes]
}

export function findTheme(themeId: string, customThemes: Theme[] = []): Theme | undefined {
  return getAllThemes(customThemes).find((theme) => theme.id === themeId)
}

export function getFallbackTheme(): Theme {
  return builtInThemes.find((theme) => theme.id === DEFAULT_THEME_ID) ?? builtInThemes[0]
}

export function resolveTheme(themeId?: string, customThemes: Theme[] = []): Theme {
  return (themeId && findTheme(themeId, customThemes)) || getFallbackTheme()
}

export function resolveThemeId(themeId: string, customThemes: Theme[] = []): string {
  return findTheme(themeId, customThemes)?.id ?? DEFAULT_THEME_ID
}

export function createCustomThemeDraft(baseTheme: Theme = getFallbackTheme()): Theme & { effects: ThemeEffects } {
  const clonedTheme = cloneTheme(baseTheme)
  return {
    ...clonedTheme,
    id: '',
    name: '',
    description: '',
    isBuiltIn: false,
    effects: clonedTheme.effects ? { ...clonedTheme.effects } : {}
  }
}
