import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  shortcuts: {
    btn: 'px-4 py-2 rounded-lg inline-flex items-center justify-center transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn bg-accent text-white hover:bg-accent-hover',
    'btn-secondary': 'btn bg-bg-card text-text-primary hover:bg-bg-secondary',
    'btn-ghost': 'btn bg-transparent hover:bg-bg-card',
    input:
      'w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary outline-none focus:border-accent transition-colors',
    card: 'bg-bg-secondary border border-border rounded-lg p-4'
  },
  theme: {
    fontFamily: {
      sans: 'var(--font-sans)',
      display: 'var(--font-display)',
      mono: 'var(--font-mono)'
    },
    fontSize: {
      xs: 'var(--text-xs)',
      sm: 'var(--text-sm)',
      base: 'var(--text-base)',
      lg: 'var(--text-lg)',
      xl: 'var(--text-xl)',
      '2xl': 'var(--text-2xl)',
      '3xl': 'var(--text-3xl)',
      '4xl': 'var(--text-4xl)'
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      full: 'var(--radius-full)'
    },
    spacing: {
      0: 'var(--space-0)',
      1: 'var(--space-1)',
      2: 'var(--space-2)',
      3: 'var(--space-3)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      8: 'var(--space-8)',
      10: 'var(--space-10)',
      12: 'var(--space-12)',
      16: 'var(--space-16)'
    },
    colors: {
      bg: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)'
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'secondary-strong': 'var(--text-secondary-strong)'
      },
      accent: {
        DEFAULT: 'var(--accent)',
        hover: 'var(--accent-hover)',
        muted: 'var(--accent-muted)'
      },
      border: {
        DEFAULT: 'var(--border)',
        subtle: 'var(--border-subtle)'
      },
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--error)'
    }
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/'
    }),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans:400,500,600,700',
        display: 'Outfit:500,600,700',
        mono: 'JetBrains Mono:400,500'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()]
})
