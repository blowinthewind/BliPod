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

export interface ThemeTokenGroup<TKey extends string> {
  id: string
  label: string
  keys: TKey[]
}

export const THEME_COLOR_GROUPS: ThemeTokenGroup<ThemeColorKey>[] = [
  {
    id: 'core-surface',
    label: '核心界面',
    keys: [
      'bgPrimary',
      'bgSecondary',
      'bgCard',
      'bgElevated',
      'bgOverlay',
      'textPrimary',
      'textSecondary',
      'textSecondaryStrong',
      'textTertiary',
      'border',
      'borderSubtle'
    ]
  },
  {
    id: 'accent-state',
    label: '主强调与状态',
    keys: ['accent', 'accentHover', 'accentMuted', 'success', 'warning', 'error']
  },
  {
    id: 'extended-visual',
    label: '扩展视觉',
    keys: [
      'accentRose',
      'accentBlush',
      'accentLilac',
      'accentViolet',
      'accentSky',
      'accentAmber',
      'accentMint',
      'glow',
      'glassBg',
      'glassBorder'
    ]
  }
]

export const THEME_EFFECT_GROUPS: ThemeTokenGroup<ThemeEffectKey>[] = [
  {
    id: 'effects',
    label: '效果',
    keys: ['bgGradient', 'bgImage', 'bgImageOpacity', 'bgBlur', 'glassEffect', 'glassBlur', 'glassOpacity']
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
      accent: '#e05a5f',
      accentHover: '#ef6c71',
      accentMuted: 'rgba(224, 90, 95, 0.16)',
      accentRose: '#ed7478',
      accentBlush: '#f2a1a4',
      accentLilac: '#ca91a1',
      accentViolet: '#b8758b',
      accentSky: '#8da6c6',
      accentAmber: '#efa347',
      accentMint: '#52b89a',
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
      accentRose: '#be7257',
      accentBlush: '#d7ac97',
      accentLilac: '#b5978a',
      accentViolet: '#a47d6d',
      accentSky: '#8f8177',
      accentAmber: '#b27a4a',
      accentMint: '#79917f',
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
      accentRose: 'color-mix(in oklch, oklch(68% 0.18 35) 82%, oklch(72% 0.12 28) 18%)',
      accentBlush: 'color-mix(in oklch, oklch(68% 0.18 35) 56%, oklch(84% 0.045 40) 44%)',
      accentLilac: 'color-mix(in oklch, oklch(68% 0.18 35) 58%, oklch(64% 0.05 22) 42%)',
      accentViolet: 'color-mix(in oklch, oklch(68% 0.18 35) 72%, oklch(58% 0.07 18) 28%)',
      accentSky: 'color-mix(in oklch, oklch(68% 0.18 35) 36%, oklch(62% 0.02 230) 64%)',
      accentAmber: 'color-mix(in oklch, oklch(68% 0.18 35) 80%, oklch(72% 0.09 70) 20%)',
      accentMint: 'color-mix(in oklch, oklch(68% 0.18 35) 34%, oklch(70% 0.05 160) 66%)',
      border: 'oklch(30% 0.02 30)',
      borderSubtle: 'oklch(24% 0.02 30)',
      success: 'oklch(68% 0.12 160)',
      warning: 'oklch(75% 0.12 80)',
      error: 'oklch(62% 0.19 25)',
      glow: 'color-mix(in oklch, oklch(68% 0.18 35) 30%, transparent)',
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
      accent: 'oklch(64% 0.12 190)',
      accentHover: 'oklch(70% 0.12 190)',
      accentMuted: 'color-mix(in oklch, oklch(64% 0.12 190) 18%, transparent)',
      accentRose: 'color-mix(in oklch, oklch(64% 0.12 190) 82%, oklch(67% 0.08 40) 18%)',
      accentBlush: 'color-mix(in oklch, oklch(64% 0.12 190) 56%, oklch(82% 0.04 45) 44%)',
      accentLilac: 'color-mix(in oklch, oklch(64% 0.12 190) 58%, oklch(64% 0.04 250) 42%)',
      accentViolet: 'color-mix(in oklch, oklch(64% 0.12 190) 72%, oklch(58% 0.06 220) 28%)',
      accentSky: 'color-mix(in oklch, oklch(64% 0.12 190) 36%, oklch(72% 0.03 220) 64%)',
      accentAmber: 'color-mix(in oklch, oklch(64% 0.12 190) 80%, oklch(72% 0.09 70) 20%)',
      accentMint: 'color-mix(in oklch, oklch(64% 0.12 190) 34%, oklch(70% 0.05 160) 66%)',
      border: 'oklch(30% 0.02 220)',
      borderSubtle: 'oklch(24% 0.02 220)',
      success: 'oklch(66% 0.11 170)',
      warning: 'oklch(76% 0.12 85)',
      error: 'oklch(62% 0.18 25)',
      glow: 'color-mix(in oklch, oklch(64% 0.12 190) 30%, transparent)',
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
      accentRose: 'color-mix(in oklch, oklch(64% 0.16 25) 82%, oklch(67% 0.08 40) 18%)',
      accentBlush: 'color-mix(in oklch, oklch(64% 0.16 25) 46%, oklch(84% 0.035 45) 54%)',
      accentLilac: 'color-mix(in oklch, oklch(64% 0.16 25) 54%, oklch(72% 0.025 35) 46%)',
      accentViolet: 'color-mix(in oklch, oklch(64% 0.16 25) 68%, oklch(61% 0.05 35) 32%)',
      accentSky: 'color-mix(in oklch, oklch(64% 0.16 25) 28%, oklch(74% 0.015 230) 72%)',
      accentAmber: 'color-mix(in oklch, oklch(64% 0.16 25) 78%, oklch(71% 0.08 70) 22%)',
      accentMint: 'color-mix(in oklch, oklch(64% 0.16 25) 28%, oklch(72% 0.04 160) 72%)',
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
