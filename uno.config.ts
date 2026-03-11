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
    'btn': 'px-4 py-2 rounded-lg inline-flex items-center justify-center transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn bg-accent text-white hover:bg-accent-hover',
    'btn-secondary': 'btn bg-bg-card text-text-primary hover:bg-bg-secondary',
    'btn-ghost': 'btn bg-transparent hover:bg-bg-card',
    'input': 'w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary outline-none focus:border-accent transition-colors',
    'card': 'bg-bg-secondary border border-border rounded-lg p-4'
  },
  theme: {
    colors: {
      bg: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        card: 'var(--bg-card)'
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)'
      },
      accent: {
        DEFAULT: 'var(--accent)',
        hover: 'var(--accent-hover)'
      },
      border: 'var(--border)'
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
        sans: 'Inter:400,500,600,700'
      }
    })
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup()
  ]
})
