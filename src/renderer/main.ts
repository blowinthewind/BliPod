import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import VueLazyload from 'vue-lazyload'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useAppSettingsStore } from './stores/appSettings'
import { useRuntimeConfigStore } from './stores/runtimeConfig'
import { lazyloadOptions } from './composables/useImageLazyload'
import { logger } from './utils/logger'
import App from './App.vue'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

// 全局错误处理器
function setupGlobalErrorHandlers(): void {
  // Vue 错误处理器
  app.config.errorHandler = (err, vm, info) => {
    logger.error('Vue Error:', {
      error: err,
      component: vm?.$options?.name || 'Unknown',
      info
    })
  }

  // 全局 JS 错误
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Window Error:', {
      message,
      source,
      lineno,
      colno,
      error
    })
    // 返回 false 让错误继续传播
    return false
  }

  // 未处理的 Promise 拒绝
  window.onunhandledrejection = (event) => {
    logger.error('Unhandled Promise Rejection:', event.reason)
    // 阻止默认处理
    event.preventDefault()
  }

  // 监听主进程发送的错误
  if (window.electronAPI) {
    // 注意：需要在 preload 中添加对应的监听器
    // 这里我们使用自定义事件
    window.addEventListener('app-error', ((event: CustomEvent) => {
      const { type, message, error } = event.detail || {}
      logger.error('App Error from Main:', { type, message, error })
    }) as EventListener)
  }
}

app.use(pinia)
app.use(router)
app.use(VueLazyload, lazyloadOptions)

// 设置全局错误处理器
setupGlobalErrorHandlers()

const themeStore = useThemeStore()
const appSettingsStore = useAppSettingsStore()
const runtimeConfigStore = useRuntimeConfigStore()

watch(
  () => appSettingsStore.settings,
  (settings) => {
    themeStore.syncFromSettings({
      currentThemeId: settings.currentThemeId,
      customThemes: settings.customThemes
    })
  },
  { deep: true, immediate: true }
)

void Promise.all([runtimeConfigStore.loadRuntimeConfig(), appSettingsStore.loadSettings()]).finally(() => {
  app.mount('#app')

  // 应用启动日志
  logger.info('BliPod Renderer started')
})
