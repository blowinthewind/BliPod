export const BUILT_IN_THEME_IDS = ['dark', 'sunset', 'ocean', 'light', 'glass'] as const

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
      accent: '#c07b59',
      accentHover: '#cd8a69',
      accentMuted: 'rgba(192, 123, 89, 0.16)',
      accentRose: '#d59072',
      accentBlush: '#d8b4a5',
      accentLilac: '#b79a92',
      accentViolet: '#9f827c',
      accentSky: '#8692a1',
      accentAmber: '#ca9a58',
      accentMint: '#719685',
      border: '#232633',
      borderSubtle: '#1b1e29',
      success: '#2c9b7d',
      warning: '#c28a38',
      error: '#d24a4a',
      glow: 'rgba(201, 133, 99, 0.2)',
      glassBg: 'rgba(18, 19, 24, 0.82)',
      glassBorder: 'rgba(255, 255, 255, 0.08)'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm ember gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(17% 0.018 34)',
      bgSecondary: 'oklch(20.5% 0.02 34)',
      bgCard: 'oklch(24.5% 0.022 34)',
      bgElevated: 'oklch(28.5% 0.024 34)',
      bgOverlay: 'color-mix(in oklch, #000 58%, transparent)',
      textPrimary: 'oklch(96% 0.008 38)',
      textSecondary: 'oklch(71% 0.014 38)',
      textSecondaryStrong: 'oklch(81% 0.012 38)',
      textTertiary: 'oklch(56% 0.012 38)',
      accent: 'oklch(60% 0.085 36)',
      accentHover: 'oklch(64% 0.078 36)',
      accentMuted: 'color-mix(in oklch, oklch(60% 0.085 36) 13%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(61% 0.11 36) 80%, oklch(67% 0.055 30) 20%)',
      accentBlush: 'color-mix(in oklch, oklch(61% 0.11 36) 40%, oklch(84% 0.025 42) 60%)',
      accentLilac: 'color-mix(in oklch, oklch(61% 0.11 36) 48%, oklch(62% 0.018 18) 52%)',
      accentViolet: 'color-mix(in oklch, oklch(61% 0.11 36) 62%, oklch(57% 0.028 18) 38%)',
      accentSky: 'color-mix(in oklch, oklch(61% 0.11 36) 36%, oklch(63% 0.01 230) 64%)',
      accentAmber: 'color-mix(in oklch, oklch(61% 0.11 36) 72%, oklch(71% 0.06 72) 28%)',
      accentMint: 'color-mix(in oklch, oklch(61% 0.11 36) 34%, oklch(69% 0.02 160) 66%)',
      border: 'oklch(31% 0.016 34)',
      borderSubtle: 'oklch(25% 0.014 34)',
      success: 'oklch(65% 0.07 156)',
      warning: 'oklch(74% 0.065 82)',
      error: 'oklch(56% 0.14 24)',
      glow: 'color-mix(in oklch, oklch(60% 0.085 36) 12%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(24.5% 0.022 34) 88%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(96% 0.008 38) 10%, transparent)'
    },
    effects: {
      bgGradient:
        'linear-gradient(135deg, oklch(17% 0.016 34) 0%, oklch(19.5% 0.018 34) 48%, oklch(22% 0.02 34) 100%)'
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep teal gradient theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(16.5% 0.018 210)',
      bgSecondary: 'oklch(20% 0.02 210)',
      bgCard: 'oklch(24% 0.022 210)',
      bgElevated: 'oklch(28% 0.024 210)',
      bgOverlay: 'color-mix(in oklch, #000 58%, transparent)',
      textPrimary: 'oklch(95% 0.008 214)',
      textSecondary: 'oklch(71% 0.013 212)',
      textSecondaryStrong: 'oklch(81% 0.012 214)',
      textTertiary: 'oklch(54% 0.011 214)',
      accent: 'oklch(59% 0.082 190)',
      accentHover: 'oklch(63% 0.076 190)',
      accentMuted: 'color-mix(in oklch, oklch(59% 0.082 190) 13%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(61% 0.095 192) 72%, oklch(65% 0.04 35) 28%)',
      accentBlush: 'color-mix(in oklch, oklch(61% 0.095 192) 40%, oklch(82% 0.02 45) 60%)',
      accentLilac: 'color-mix(in oklch, oklch(61% 0.095 192) 52%, oklch(63% 0.022 248) 48%)',
      accentViolet: 'color-mix(in oklch, oklch(61% 0.095 192) 62%, oklch(57% 0.03 222) 38%)',
      accentSky: 'color-mix(in oklch, oklch(61% 0.095 192) 42%, oklch(71% 0.016 220) 58%)',
      accentAmber: 'color-mix(in oklch, oklch(61% 0.095 192) 62%, oklch(70% 0.055 72) 38%)',
      accentMint: 'color-mix(in oklch, oklch(61% 0.095 192) 54%, oklch(69% 0.028 162) 46%)',
      border: 'oklch(31% 0.016 212)',
      borderSubtle: 'oklch(25% 0.014 212)',
      success: 'oklch(64% 0.072 160)',
      warning: 'oklch(73% 0.07 82)',
      error: 'oklch(56% 0.14 24)',
      glow: 'color-mix(in oklch, oklch(59% 0.082 190) 12%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(24% 0.022 210) 88%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(95% 0.008 214) 10%, transparent)'
    },
    effects: {
      bgGradient:
        'linear-gradient(180deg, oklch(16.5% 0.016 210) 0%, oklch(20% 0.018 210) 50%, oklch(23.5% 0.02 210) 100%)'
    }
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(96.5% 0.008 86)',
      bgSecondary: 'oklch(93.4% 0.011 86)',
      bgCard: 'oklch(98.7% 0.004 86)',
      bgElevated: 'oklch(99.2% 0.003 86)',
      bgOverlay: 'rgba(18, 22, 28, 0.32)',
      textPrimary: 'oklch(25% 0.012 74)',
      textSecondary: 'oklch(52% 0.012 78)',
      textSecondaryStrong: 'oklch(40% 0.014 76)',
      textTertiary: 'oklch(70% 0.01 82)',
      accent: 'oklch(58% 0.08 38)',
      accentHover: 'oklch(54% 0.078 38)',
      accentMuted: 'color-mix(in oklch, oklch(58% 0.08 38) 12%, transparent)',
      accentRose: '#ba7b61',
      accentBlush: '#dcc0b2',
      accentLilac: '#b7a1a0',
      accentViolet: '#9f8d90',
      accentSky: '#95a0ad',
      accentAmber: '#bf8b52',
      accentMint: '#8ba090',
      border: 'oklch(87.5% 0.009 86)',
      borderSubtle: 'oklch(93.2% 0.005 86)',
      success: 'oklch(55% 0.078 162)',
      warning: 'oklch(65% 0.08 80)',
      error: 'oklch(56% 0.145 24)',
      glow: 'color-mix(in oklch, oklch(58% 0.08 38) 10%, transparent)',
      glassBg: 'rgba(255, 255, 255, 0.88)',
      glassBorder: 'rgba(24, 28, 36, 0.08)'
    }
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted slate glass theme',
    isBuiltIn: true,
    colors: {
      bgPrimary: 'oklch(16% 0.01 245)',
      bgSecondary: 'oklch(18% 0.01 245 / 0.88)',
      bgCard: 'oklch(20% 0.012 245 / 0.82)',
      bgElevated: 'oklch(22% 0.013 245 / 0.77)',
      bgOverlay: 'color-mix(in oklch, #000 60%, transparent)',
      textPrimary: 'oklch(96% 0.006 245)',
      textSecondary: 'oklch(72% 0.01 245)',
      textSecondaryStrong: 'oklch(82% 0.01 245)',
      textTertiary: 'oklch(56% 0.01 245)',
      accent: 'oklch(62% 0.085 30)',
      accentHover: 'oklch(66% 0.08 30)',
      accentMuted: 'color-mix(in oklch, oklch(62% 0.085 30) 14%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(62% 0.085 30) 74%, oklch(66% 0.04 36) 26%)',
      accentBlush: 'color-mix(in oklch, oklch(62% 0.085 30) 32%, oklch(84% 0.018 42) 68%)',
      accentLilac: 'color-mix(in oklch, oklch(62% 0.085 30) 40%, oklch(70% 0.018 320) 60%)',
      accentViolet: 'color-mix(in oklch, oklch(62% 0.085 30) 48%, oklch(60% 0.022 315) 52%)',
      accentSky: 'color-mix(in oklch, oklch(62% 0.085 30) 24%, oklch(74% 0.008 230) 76%)',
      accentAmber: 'color-mix(in oklch, oklch(62% 0.085 30) 62%, oklch(71% 0.045 72) 38%)',
      accentMint: 'color-mix(in oklch, oklch(62% 0.085 30) 24%, oklch(72% 0.018 165) 76%)',
      border: 'color-mix(in oklch, oklch(92% 0.006 245) 16%, transparent)',
      borderSubtle: 'color-mix(in oklch, oklch(92% 0.006 245) 11%, transparent)',
      success: 'oklch(65% 0.07 165)',
      warning: 'oklch(72% 0.075 78)',
      error: 'oklch(57% 0.145 24)',
      glow: 'color-mix(in oklch, oklch(62% 0.085 30) 14%, transparent)',
      glassBg: 'color-mix(in oklch, oklch(18% 0.01 245 / 0.88) 94%, transparent)',
      glassBorder: 'color-mix(in oklch, oklch(92% 0.006 245) 16%, transparent)'
    },
    effects: {
      glassEffect: true,
      glassBlur: '20px',
      glassOpacity: 0.86
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
