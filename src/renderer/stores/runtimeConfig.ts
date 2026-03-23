import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DEFAULT_RUNTIME_CONFIG,
  normalizeRuntimeConfig,
  type RuntimeConfig
} from '../../shared/runtimeConfig'

export const useRuntimeConfigStore = defineStore('runtimeConfig', () => {
  const config = ref<RuntimeConfig>(DEFAULT_RUNTIME_CONFIG)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const ui = computed(() => config.value.ui)
  const behavior = computed(() => config.value.behavior)

  async function loadRuntimeConfig() {
    isLoading.value = true
    error.value = null

    try {
      const nextConfig = await window.electronAPI.config.getRuntimeConfig()
      config.value = normalizeRuntimeConfig(nextConfig)
      return config.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load runtime config'
      config.value = DEFAULT_RUNTIME_CONFIG
      return config.value
    } finally {
      isLoading.value = false
    }
  }

  return {
    config,
    isLoading,
    error,
    ui,
    behavior,
    loadRuntimeConfig
  }
})
