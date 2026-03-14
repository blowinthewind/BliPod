import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueLazyload from 'vue-lazyload'
import router from './router'
import { useThemeStore } from './stores/theme'
import { lazyloadOptions } from './composables/useImageLazyload'
import App from './App.vue'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueLazyload, lazyloadOptions)

const themeStore = useThemeStore()
themeStore.initTheme()

app.mount('#app')
