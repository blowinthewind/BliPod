import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import components from 'unplugin-vue-components/vite'
import autoImport from 'unplugin-auto-import/vite'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [
    vue(),
    UnoCSS(),
    electron([
      {
        entry: resolve(__dirname, 'src/main/main.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: resolve(__dirname, 'src/preload/preload.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/preload'),
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    autoImport({
      imports: ['vue', 'pinia'],
      dts: resolve(__dirname, 'src/renderer/auto-imports.d.ts')
    }),
    components({
      dirs: [resolve(__dirname, 'src/renderer/components')],
      dts: resolve(__dirname, 'src/renderer/components.d.ts')
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
