<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, toRaw, nextTick, watch } from 'vue'
  import { useThemeStore, type Theme, type ThemeColors, type ThemeEffects } from '@/stores/theme'
  import { useAuthStore } from '@/stores/auth'
  import { useFavoritesStore } from '@/stores/favorites'
  import { usePlaylistsStore } from '@/stores/playlists'
  import { usePlayerStore } from '@/stores/player'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import {
    Settings,
    Download,
    LogIn,
    Plus,
    Trash2,
    Copy,
    Palette,
    Sparkles,
    LogOut,
    Upload,
    AlertCircle,
    Check,
    MemoryStick
  } from 'lucide-vue-next'
  import LoginDialog from '@/components/Layout/LoginDialog.vue'

  const themeStore = useThemeStore()
  const authStore = useAuthStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const playerStore = usePlayerStore()
  const appSettingsStore = useAppSettingsStore()

  const autoPlay = computed({
    get: () => appSettingsStore.autoPlay,
    set: (value) => appSettingsStore.setAutoPlay(value)
  })
  const rememberPosition = computed({
    get: () => appSettingsStore.rememberPosition,
    set: (value) => appSettingsStore.setRememberPosition(value)
  })
  const showCreateTheme = ref(false)
  const showEditTheme = ref(false)
  const showLoginDialog = ref(false)
  const editingThemeId = ref<string | null>(null)
  const createThemeDialogRef = ref<HTMLDivElement | null>(null)
  const editThemeDialogRef = ref<HTMLDivElement | null>(null)
  const createThemeIdInputRef = ref<HTMLInputElement | null>(null)
  const editThemeNameInputRef = ref<HTMLInputElement | null>(null)
  const lastFocusedElementRef = ref<HTMLElement | null>(null)

  interface CategoryStats {
    key: string
    name: string
    count: number
  }

  const categoryStats = ref<CategoryStats[]>([])
  const selectedExportCategories = ref<string[]>([])
  const selectedImportCategories = ref<string[]>([])
  const importStrategy = ref<'merge' | 'overwrite'>('merge')
  const isExporting = ref(false)
  const isImporting = ref(false)
  const exportMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
  const importMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
  const showExportOptions = ref(false)
  const showImportOptions = ref(false)

  const memorySettings = ref({
    searchViewTimeout: 10 * 60 * 1000,
    cleanupMessage: '' as string | null
  })

  let unsubscribe: (() => void) | null = null

  onMounted(async () => {
    unsubscribe = authStore.setLoginListener()
    authStore.checkLoginStatus()
    await loadCategoryStats()
    loadMemorySettings()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  watch(showCreateTheme, async (visible) => {
    if (visible) {
      lastFocusedElementRef.value = document.activeElement as HTMLElement | null
      await nextTick()
      createThemeIdInputRef.value?.focus()
      return
    }

    await nextTick()
    lastFocusedElementRef.value?.focus()
  })

  watch(showEditTheme, async (visible) => {
    if (visible) {
      lastFocusedElementRef.value = document.activeElement as HTMLElement | null
      await nextTick()
      editThemeNameInputRef.value?.focus()
      return
    }

    await nextTick()
    lastFocusedElementRef.value?.focus()
  })

  async function loadCategoryStats() {
    try {
      const stats = await window.electronAPI.store.getCategoryStats()
      categoryStats.value = stats
      selectedExportCategories.value = stats.map((s) => s.key)
    } catch (error) {
      console.error('Failed to load category stats:', error)
    }
  }

  const dataStats = computed(() => {
    const favoritesStat = categoryStats.value.find((s) => s.key === 'favorites')
    const playlistsStat = categoryStats.value.find((s) => s.key === 'playlists')
    return {
      favoritesCount: favoritesStat?.count || 0,
      playlistsCount: playlistsStat?.count || 0,
      totalVideosInPlaylists: 0
    }
  })

  function toggleExportCategory(key: string) {
    const index = selectedExportCategories.value.indexOf(key)
    if (index === -1) {
      selectedExportCategories.value.push(key)
    } else {
      selectedExportCategories.value.splice(index, 1)
    }
  }

  function toggleImportCategory(key: string) {
    const index = selectedImportCategories.value.indexOf(key)
    if (index === -1) {
      selectedImportCategories.value.push(key)
    } else {
      selectedImportCategories.value.splice(index, 1)
    }
  }

  function selectAllExportCategories() {
    selectedExportCategories.value = categoryStats.value.map((s) => s.key)
  }

  function deselectAllExportCategories() {
    selectedExportCategories.value = []
  }

  async function handleExport() {
    if (selectedExportCategories.value.length === 0) {
      exportMessage.value = { type: 'error', text: 'Please select at least one category' }
      setTimeout(() => {
        exportMessage.value = null
      }, 3000)
      return
    }

    isExporting.value = true
    exportMessage.value = null

    try {
      const result = await window.electronAPI.store.exportDataToFile({
        categories: toRaw(selectedExportCategories.value)
      })

      if (result.success) {
        exportMessage.value = {
          type: 'success',
          text: `Exported to ${result.filePath?.split('/').pop()}`
        }
        showExportOptions.value = false
      } else if (result.error === 'Export cancelled') {
        showExportOptions.value = false
      } else {
        exportMessage.value = { type: 'error', text: result.error || 'Export failed' }
      }
    } catch (error) {
      exportMessage.value = {
        type: 'error',
        text: error instanceof Error ? error.message : 'Export failed'
      }
    } finally {
      isExporting.value = false
      setTimeout(() => {
        exportMessage.value = null
      }, 5000)
    }
  }

  async function handleImport() {
    if (selectedImportCategories.value.length === 0) {
      importMessage.value = { type: 'error', text: 'Please select at least one category' }
      setTimeout(() => {
        importMessage.value = null
      }, 3000)
      return
    }

    isImporting.value = true
    importMessage.value = null

    try {
      const result = await window.electronAPI.store.importDataFromFile({
        categories: toRaw(selectedImportCategories.value),
        strategy: toRaw(importStrategy.value)
      })

      if (result.success) {
        const statsText = Object.entries(result.stats || {})
          .map(([key, val]) => {
            const category = categoryStats.value.find((c) => c.key === key)
            return `${category?.name || key}: ${val.imported}`
          })
          .join(', ')

        importMessage.value = {
          type: 'success',
          text: statsText || 'Import completed'
        }
        showImportOptions.value = false
        await loadCategoryStats()
        await favoritesStore.loadFavorites()
        await playlistsStore.loadPlaylists()
        await playerStore.loadUserQueue()
        await appSettingsStore.loadSettings()
        playerStore.loadHistory()
      } else if (result.error === 'Import cancelled') {
        showImportOptions.value = false
      } else {
        importMessage.value = { type: 'error', text: result.error || 'Import failed' }
      }
    } catch (error) {
      importMessage.value = {
        type: 'error',
        text: error instanceof Error ? error.message : 'Import failed'
      }
    } finally {
      isImporting.value = false
      setTimeout(() => {
        importMessage.value = null
      }, 5000)
    }
  }

  function handleExportAction() {
    if (!showExportOptions.value) {
      showExportOptions.value = true
      return
    }
    handleExport()
  }

  function handleImportAction() {
    if (!showImportOptions.value) {
      showImportOptions.value = true
      return
    }
    handleImport()
  }

  const defaultColors: ThemeColors = {
    bgPrimary: '#0a0a0b',
    bgSecondary: '#111113',
    bgCard: '#18181b',
    bgElevated: '#1f1f23',
    bgOverlay: 'rgba(0, 0, 0, 0.6)',
    textPrimary: '#fafafa',
    textSecondary: '#8b8b96',
    textSecondaryStrong: '#a7a7b2',
    textTertiary: '#52525b',
    accent: '#f43f5e',
    accentHover: '#fb7185',
    accentMuted: 'rgba(244, 63, 94, 0.15)',
    border: '#27272a',
    borderSubtle: '#1f1f23',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    glow: 'rgba(244, 63, 94, 0.25)',
    glassBg: 'rgba(17, 17, 19, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.08)'
  }

  const newTheme = ref<Partial<Theme>>({
    id: '',
    name: '',
    description: '',
    colors: { ...defaultColors },
    effects: {}
  })

  const editingTheme = ref<(Theme & { effects: ThemeEffects }) | null>(null)

  const colorLabels: Record<keyof ThemeColors, string> = {
    bgPrimary: 'Background',
    bgSecondary: 'Sidebar',
    bgCard: 'Cards',
    bgElevated: 'Elevated',
    bgOverlay: 'Overlay',
    textPrimary: 'Text Primary',
    textSecondary: 'Text Secondary',
    textSecondaryStrong: 'Text Secondary Strong',
    textTertiary: 'Text Tertiary',
    accent: 'Accent',
    accentHover: 'Accent Hover',
    accentMuted: 'Accent Muted',
    border: 'Border',
    borderSubtle: 'Border Subtle',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
    glow: 'Glow',
    glassBg: 'Glass Background',
    glassBorder: 'Glass Border'
  }

  function setTheme(themeId: string) {
    themeStore.setTheme(themeId)
  }

  function openCreateTheme() {
    newTheme.value = {
      id: '',
      name: '',
      description: '',
      colors: { ...defaultColors },
      effects: {}
    }
    showCreateTheme.value = true
  }

  function closeCreateTheme() {
    showCreateTheme.value = false
  }

  function createCustomTheme() {
    if (!newTheme.value.id || !newTheme.value.name) return

    themeStore.addCustomTheme({
      id: newTheme.value.id,
      name: newTheme.value.name,
      description: newTheme.value.description || 'Custom theme',
      colors: newTheme.value.colors as ThemeColors,
      effects:
        Object.keys(newTheme.value.effects || {}).length > 0 ? newTheme.value.effects : undefined
    })

    showCreateTheme.value = false
  }

  function openEditTheme(themeId: string) {
    const theme = themeStore.allThemes.find((t) => t.id === themeId)
    if (theme && !theme.isBuiltIn) {
      editingTheme.value = JSON.parse(
        JSON.stringify({
          ...theme,
          effects: theme.effects || {}
        })
      )
      editingThemeId.value = themeId
      showEditTheme.value = true
    }
  }

  function closeEditTheme() {
    showEditTheme.value = false
    editingTheme.value = null
    editingThemeId.value = null
  }

  function saveEditedTheme() {
    if (editingTheme.value && editingThemeId.value) {
      themeStore.updateCustomTheme(editingThemeId.value, {
        name: editingTheme.value.name,
        description: editingTheme.value.description,
        colors: editingTheme.value.colors,
        effects: editingTheme.value.effects
      })
      showEditTheme.value = false
      editingTheme.value = null
      editingThemeId.value = null
    }
  }

  function getFocusableElements(container: HTMLElement | null) {
    if (!container) return [] as HTMLElement[]

    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
    )
  }

  function trapFocus(event: KeyboardEvent, container: HTMLElement | null, onEscape: () => void) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (activeElement === firstElement || !container?.contains(activeElement)) {
        event.preventDefault()
        lastElement.focus()
      }
      return
    }

    if (activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function handleCreateThemeKeydown(event: KeyboardEvent) {
    trapFocus(event, createThemeDialogRef.value, closeCreateTheme)
  }

  function handleEditThemeKeydown(event: KeyboardEvent) {
    trapFocus(event, editThemeDialogRef.value, closeEditTheme)
  }

  function deleteTheme(themeId: string) {
    themeStore.removeCustomTheme(themeId)
  }

  function duplicateTheme(themeId: string) {
    const newId = `${themeId}-copy-${Date.now()}`
    const source = themeStore.allThemes.find((t) => t.id === themeId)
    if (source) {
      themeStore.duplicateTheme(themeId, newId, `${source.name} Copy`)
    }
  }

  function getThemePreviewStyle(theme: Theme) {
    const style: Record<string, string> = {}

    if (theme.effects?.bgGradient) {
      style.background = theme.effects.bgGradient
    } else {
      style.background = theme.colors.bgPrimary
    }

    return style
  }

  function openLoginDialog() {
    showLoginDialog.value = true
  }

  function closeLoginDialog() {
    showLoginDialog.value = false
  }

  function handleLogout() {
    authStore.logout()
  }

  // 加载内存管理设置
  function loadMemorySettings() {
    try {
      const stored = localStorage.getItem('blipod_memory_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        memorySettings.value.searchViewTimeout = parsed.searchViewTimeout || 10 * 60 * 1000
      }
    } catch {
      // ignore
    }
  }

  // 更新内存管理设置
  async function updateMemoryTimeout() {
    try {
      await window.electronAPI.memory.setIdleTimeout(memorySettings.value.searchViewTimeout)
      localStorage.setItem(
        'blipod_memory_settings',
        JSON.stringify({
          searchViewTimeout: memorySettings.value.searchViewTimeout
        })
      )
      memorySettings.value.cleanupMessage = '设置已保存'
      setTimeout(() => {
        memorySettings.value.cleanupMessage = null
      }, 3000)
    } catch (error) {
      memorySettings.value.cleanupMessage = '保存失败'
    }
  }

  // 立即清理内存
  async function cleanupMemoryNow() {
    try {
      await window.electronAPI.memory.cleanup()
      memorySettings.value.cleanupMessage = '内存已清理'
      setTimeout(() => {
        memorySettings.value.cleanupMessage = null
      }, 3000)
    } catch (error) {
      memorySettings.value.cleanupMessage = '清理失败'
    }
  }

  // 显示内存状态
  async function showMemoryStats() {
    try {
      const stats = await window.electronAPI.memory.getStats()
      alert(
        `内存使用: ${stats.heapUsed}MB / ${stats.heapTotal}MB\nRSS: ${stats.rss}MB\nSearchView: ${stats.searchViewActive ? '活跃' : '未创建'}\nPlayerView: ${stats.playerViewActive ? '活跃' : '未创建'}`
      )
    } catch (error) {
      alert('获取内存状态失败')
    }
  }
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <div class="header-icon">
        <Settings :size="24" />
      </div>
      <div class="header-text">
        <h1 class="page-title">设置</h1>
        <p class="page-desc">按你的听播习惯调整 BliPod</p>
      </div>
    </div>

    <div class="settings-sections">
      <section class="settings-section">
        <h2 class="section-title">账号</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">哔哩哔哩账号</span>
              <span class="setting-desc" v-if="authStore.isLoggedIn && authStore.userInfo">
                当前登录：{{ authStore.userInfo.name }}
              </span>
              <span class="setting-desc" v-else>
                登录后即可同步账号状态并获得更完整的使用体验
              </span>
            </div>
            <div class="account-actions">
              <template v-if="authStore.isLoggedIn && authStore.userInfo">
                <div class="user-badge">
                  <img
                    :src="authStore.userInfo.face"
                    :alt="authStore.userInfo.name"
                    class="user-avatar-small"
                  />
                  <span class="user-name-small">{{ authStore.userInfo.name }}</span>
                </div>
                <button class="logout-btn" @click="handleLogout">
                  <LogOut :size="16" />
                  退出登录
                </button>
              </template>
              <template v-else>
                <button class="login-btn" @click="openLoginDialog">
                  <LogIn :size="18" />
                  登录
                </button>
              </template>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="section-header-row">
          <h2 class="section-title">
            <Palette :size="18" />
            主题
          </h2>
          <button class="add-theme-btn" @click="openCreateTheme">
            <Plus :size="16" />
            新建主题
          </button>
        </div>

        <div class="theme-grid">
          <div
            v-for="theme in themeStore.allThemes"
            :key="theme.id"
            class="theme-card"
            :class="{ active: themeStore.currentThemeId === theme.id }"
            @click="setTheme(theme.id)"
          >
            <div class="theme-preview" :style="getThemePreviewStyle(theme)">
              <div class="preview-sidebar" :style="{ background: theme.colors.bgSecondary }"></div>
              <div class="preview-card" :style="{ background: theme.colors.bgCard }"></div>
              <div class="preview-accent" :style="{ background: theme.colors.accent }"></div>
              <div v-if="theme.effects?.glassEffect" class="preview-glass">
                <Sparkles :size="12" />
              </div>
            </div>
            <div class="theme-info">
              <div class="theme-meta">
                <span class="theme-name">{{ theme.name }}</span>
                <span v-if="theme.isBuiltIn" class="theme-badge">内置</span>
              </div>
              <div class="theme-actions" v-if="!theme.isBuiltIn">
                <button
                  class="theme-action-btn"
                  @click.stop="openEditTheme(theme.id)"
                  aria-label="编辑主题"
                >
                  <Palette :size="14" />
                </button>
                <button
                  class="theme-action-btn"
                  @click.stop="duplicateTheme(theme.id)"
                  aria-label="复制主题"
                >
                  <Copy :size="14" />
                </button>
                <button
                  class="theme-action-btn danger"
                  @click.stop="deleteTheme(theme.id)"
                  aria-label="删除主题"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
              <div class="theme-actions" v-else>
                <button
                  class="theme-action-btn"
                  @click.stop="duplicateTheme(theme.id)"
                  aria-label="复制主题"
                >
                  <Copy :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">播放</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span id="auto-play-label" class="setting-label">启动后自动续播</span>
              <span class="setting-desc">应用启动后自动继续播放上次未播完的视频</span>
            </div>
            <label class="toggle" aria-labelledby="auto-play-label">
              <input type="checkbox" v-model="autoPlay" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span id="remember-position-label" class="setting-label">记住播放进度</span>
              <span class="setting-desc">下次播放时从上次停下的位置继续</span>
            </div>
            <label class="toggle" aria-labelledby="remember-position-label">
              <input type="checkbox" v-model="rememberPosition" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">
          <MemoryStick :size="18" />
          内存管理
        </h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">搜索页回收时间</span>
              <span class="setting-desc">空闲多久后自动清理搜索页以释放内存</span>
              <div v-if="memorySettings.cleanupMessage" class="message-toast success">
                <Check :size="14" />
                {{ memorySettings.cleanupMessage }}
              </div>
            </div>
            <select
              v-model="memorySettings.searchViewTimeout"
              @change="updateMemoryTimeout"
              class="timeout-select"
            >
              <option :value="5 * 60 * 1000">5 分钟</option>
              <option :value="10 * 60 * 1000">10 分钟（默认）</option>
              <option :value="15 * 60 * 1000">15 分钟</option>
              <option :value="20 * 60 * 1000">20 分钟</option>
              <option :value="30 * 60 * 1000">30 分钟</option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">内存状态</span>
              <span class="setting-desc">查看当前内存占用和活跃页面</span>
            </div>
            <div class="memory-actions">
              <button class="action-btn" @click="showMemoryStats">查看状态</button>
              <button class="action-btn" @click="cleanupMemoryNow">立即清理</button>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">数据</h2>
        <div class="settings-card">
          <div class="setting-item data-stats">
            <div class="setting-info">
              <span class="setting-label">数据概览</span>
              <span class="setting-desc">
                {{ dataStats.favoritesCount }} 个收藏 · {{ dataStats.playlistsCount }} 个播放列表
              </span>
            </div>
          </div>

          <div class="setting-item category-selection">
            <div class="setting-info">
              <div class="category-header">
                <span class="setting-label">导出数据</span>
                <div class="category-actions" v-if="showExportOptions">
                  <button class="small-btn" @click="selectAllExportCategories">全选</button>
                  <button class="small-btn" @click="deselectAllExportCategories">取消全选</button>
                </div>
              </div>
              <span class="setting-desc">选择要导出的数据分类</span>
              <div v-if="exportMessage" class="message-toast" :class="exportMessage.type">
                <Check v-if="exportMessage.type === 'success'" :size="14" />
                <AlertCircle v-else :size="14" />
                {{ exportMessage.text }}
              </div>
            </div>
            <div v-if="showExportOptions" class="category-list">
              <label
                v-for="category in categoryStats"
                :key="category.key"
                class="category-checkbox"
              >
                <input
                  type="checkbox"
                  :checked="selectedExportCategories.includes(category.key)"
                  @change="toggleExportCategory(category.key)"
                />
                <span class="checkbox-label">
                  {{ category.name }}
                  <span class="category-count">({{ category.count }})</span>
                </span>
              </label>
            </div>
            <button class="action-btn" :disabled="isExporting" @click="handleExportAction">
              <Download :size="18" :class="{ 'animate-spin': isExporting }" />
              {{ isExporting ? '正在导出...' : showExportOptions ? '导出已选内容' : '导出' }}
            </button>
          </div>

          <div class="setting-item category-selection">
            <div class="setting-info">
              <span class="setting-label">导入数据</span>
              <span class="setting-desc">选择文件后，再勾选需要导入的数据分类</span>
              <div v-if="importMessage" class="message-toast" :class="importMessage.type">
                <Check v-if="importMessage.type === 'success'" :size="14" />
                <AlertCircle v-else :size="14" />
                {{ importMessage.text }}
              </div>
            </div>
            <div v-if="showImportOptions" class="import-strategy">
              <select v-model="importStrategy" class="strategy-select">
                <option value="merge">合并导入（保留现有数据）</option>
                <option value="overwrite">覆盖导入（替换全部数据）</option>
              </select>
            </div>
            <div v-if="showImportOptions" class="category-list">
              <label
                v-for="category in categoryStats"
                :key="category.key"
                class="category-checkbox"
              >
                <input
                  type="checkbox"
                  :checked="selectedImportCategories.includes(category.key)"
                  @change="toggleImportCategory(category.key)"
                />
                <span class="checkbox-label">
                  {{ category.name }}
                </span>
              </label>
            </div>
            <button class="action-btn" :disabled="isImporting" @click="handleImportAction">
              <Upload :size="18" :class="{ 'animate-spin': isImporting }" />
              {{ isImporting ? '正在导入...' : showImportOptions ? '导入已选内容' : '导入' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <LoginDialog :visible="showLoginDialog" @close="closeLoginDialog" />

    <!-- Create Theme Modal -->
    <div class="modal-overlay" v-if="showCreateTheme" @click.self="closeCreateTheme">
      <div
        ref="createThemeDialogRef"
        class="modal theme-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-theme-title"
        @keydown="handleCreateThemeKeydown"
      >
        <h2 id="create-theme-title" class="modal-title">新建主题</h2>

        <div class="modal-content">
          <div class="form-row">
            <div class="form-group">
              <label for="create-theme-id">主题 ID</label>
              <input
                id="create-theme-id"
                ref="createThemeIdInputRef"
                type="text"
                v-model="newTheme.id"
                placeholder="my-theme"
              />
            </div>
            <div class="form-group">
              <label for="create-theme-name">主题名称</label>
              <input
                id="create-theme-name"
                type="text"
                v-model="newTheme.name"
                placeholder="我的主题"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="create-theme-description">主题说明</label>
            <input
              id="create-theme-description"
              type="text"
              v-model="newTheme.description"
              placeholder="描述这个主题适合什么样的听播氛围"
            />
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Palette :size="16" />
              颜色
            </h3>
            <div class="color-grid">
              <div v-for="(label, key) in colorLabels" :key="key" class="color-item">
                <label :for="`create-color-text-${String(key)}`">{{ label }}</label>
                <div class="color-input-wrapper">
                  <input
                    type="color"
                    :value="
                      newTheme.colors?.[key as keyof ThemeColors] ||
                      defaultColors[key as keyof ThemeColors]
                    "
                    @input="
                      (e) =>
                        newTheme.colors &&
                        (newTheme.colors[key as keyof ThemeColors] = (
                          e.target as HTMLInputElement
                        ).value)
                    "
                  />
                  <input
                    :id="`create-color-text-${String(key)}`"
                    type="text"
                    :value="newTheme.colors?.[key as keyof ThemeColors] || ''"
                    @input="
                      (e) =>
                        newTheme.colors &&
                        (newTheme.colors[key as keyof ThemeColors] = (
                          e.target as HTMLInputElement
                        ).value)
                    "
                    class="color-text-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Sparkles :size="16" />
              效果
            </h3>

            <div class="effect-item">
              <label for="create-theme-bg-gradient">背景渐变</label>
              <input
                id="create-theme-bg-gradient"
                type="text"
                v-model="newTheme.effects!.bgGradient"
                placeholder="linear-gradient(135deg, #1a1a1a, #2d2d2d)"
              />
            </div>

            <div class="effect-item">
              <label for="create-theme-bg-image">背景图地址</label>
              <input
                id="create-theme-bg-image"
                type="text"
                v-model="newTheme.effects!.bgImage"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div class="effect-row">
              <div class="effect-item half">
                <label for="create-theme-image-opacity">背景图透明度（0-1）</label>
                <input
                  id="create-theme-image-opacity"
                  type="number"
                  v-model.number="newTheme.effects!.bgImageOpacity"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.5"
                />
              </div>
              <div class="effect-item half">
                <label for="create-theme-bg-blur">背景模糊</label>
                <input
                  id="create-theme-bg-blur"
                  type="text"
                  v-model="newTheme.effects!.bgBlur"
                  placeholder="10px"
                />
              </div>
            </div>

            <div class="effect-toggle">
              <label class="toggle">
                <input type="checkbox" v-model="newTheme.effects!.glassEffect" />
                <span class="toggle-slider"></span>
              </label>
              <span>启用玻璃效果</span>
            </div>

            <div v-if="newTheme.effects?.glassEffect" class="effect-row">
              <div class="effect-item half">
                <label for="create-theme-glass-blur">玻璃模糊</label>
                <input
                  id="create-theme-glass-blur"
                  type="text"
                  v-model="newTheme.effects!.glassBlur"
                  placeholder="20px"
                />
              </div>
              <div class="effect-item half">
                <label for="create-theme-glass-opacity">玻璃透明度（0-1）</label>
                <input
                  id="create-theme-glass-opacity"
                  type="number"
                  v-model.number="newTheme.effects!.glassOpacity"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.8"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" type="button" @click="closeCreateTheme">取消</button>
          <button class="modal-btn confirm" type="button" @click="createCustomTheme">
            创建主题
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Theme Modal -->
    <div class="modal-overlay" v-if="showEditTheme && editingTheme" @click.self="closeEditTheme">
      <div
        ref="editThemeDialogRef"
        class="modal theme-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-theme-title"
        @keydown="handleEditThemeKeydown"
      >
        <h2 id="edit-theme-title" class="modal-title">编辑主题：{{ editingTheme.name }}</h2>

        <div class="modal-content">
          <div class="form-row">
            <div class="form-group">
              <label for="edit-theme-name">主题名称</label>
              <input
                id="edit-theme-name"
                ref="editThemeNameInputRef"
                type="text"
                v-model="editingTheme.name"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="edit-theme-description">主题说明</label>
            <input id="edit-theme-description" type="text" v-model="editingTheme.description" />
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Palette :size="16" />
              颜色
            </h3>
            <div class="color-grid">
              <div v-for="(label, key) in colorLabels" :key="key" class="color-item">
                <label :for="`edit-color-text-${String(key)}`">{{ label }}</label>
                <div class="color-input-wrapper">
                  <input
                    type="color"
                    :value="
                      editingTheme!.colors[key as keyof ThemeColors] ||
                      defaultColors[key as keyof ThemeColors]
                    "
                    @input="
                      (e) =>
                        (editingTheme!.colors[key as keyof ThemeColors] = (
                          e.target as HTMLInputElement
                        ).value)
                    "
                  />
                  <input
                    :id="`edit-color-text-${String(key)}`"
                    type="text"
                    :value="editingTheme!.colors[key as keyof ThemeColors] || ''"
                    @input="
                      (e) =>
                        (editingTheme!.colors[key as keyof ThemeColors] = (
                          e.target as HTMLInputElement
                        ).value)
                    "
                    class="color-text-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Sparkles :size="16" />
              效果
            </h3>

            <div class="effect-item">
              <label for="edit-theme-bg-gradient">背景渐变</label>
              <input
                id="edit-theme-bg-gradient"
                type="text"
                v-model="editingTheme!.effects.bgGradient"
                placeholder="linear-gradient(135deg, #1a1a1a, #2d2d2d)"
              />
            </div>

            <div class="effect-item">
              <label for="edit-theme-bg-image">背景图地址</label>
              <input
                id="edit-theme-bg-image"
                type="text"
                v-model="editingTheme!.effects.bgImage"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div class="effect-row">
              <div class="effect-item half">
                <label for="edit-theme-image-opacity">背景图透明度（0-1）</label>
                <input
                  id="edit-theme-image-opacity"
                  type="number"
                  v-model.number="editingTheme!.effects.bgImageOpacity"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
              <div class="effect-item half">
                <label for="edit-theme-bg-blur">背景模糊</label>
                <input
                  id="edit-theme-bg-blur"
                  type="text"
                  v-model="editingTheme!.effects.bgBlur"
                  placeholder="10px"
                />
              </div>
            </div>

            <div class="effect-toggle">
              <label class="toggle">
                <input type="checkbox" v-model="editingTheme!.effects.glassEffect" />
                <span class="toggle-slider"></span>
              </label>
              <span>启用玻璃效果</span>
            </div>

            <div v-if="editingTheme!.effects?.glassEffect" class="effect-row">
              <div class="effect-item half">
                <label for="edit-theme-glass-blur">玻璃模糊</label>
                <input
                  id="edit-theme-glass-blur"
                  type="text"
                  v-model="editingTheme!.effects.glassBlur"
                  placeholder="20px"
                />
              </div>
              <div class="effect-item half">
                <label for="edit-theme-glass-opacity">玻璃透明度（0-1）</label>
                <input
                  id="edit-theme-glass-opacity"
                  type="number"
                  v-model.number="editingTheme!.effects.glassOpacity"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn cancel" type="button" @click="closeEditTheme">取消</button>
          <button class="modal-btn confirm" type="button" @click="saveEditedTheme">保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .settings-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: min(900px, 100%);
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg, 12px);
    background: linear-gradient(135deg, var(--accent), var(--accent-mint));
    color: white;
  }

  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--text-primary);
  }

  .page-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .settings-sections {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 4px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .settings-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border-radius: 12px;
    overflow: hidden;
    padding: 8px 0;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-desc {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .account-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-card);
    border-radius: 20px;
  }

  .user-avatar-small {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-name-small {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
  }

  .login-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .login-btn:hover {
    background: var(--accent-hover);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .logout-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--error);
    color: var(--error);
  }

  .add-theme-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .add-theme-btn:hover {
    background: var(--accent-hover);
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
  }

  .theme-card {
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
    border: 2px solid transparent;
  }

  .theme-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .theme-card.active {
    border-color: var(--accent);
  }

  .theme-preview {
    position: relative;
    height: 100px;
    display: flex;
    padding: 12px;
    gap: 6px;
  }

  .preview-sidebar {
    width: 25%;
    border-radius: 4px;
  }

  .preview-card {
    flex: 1;
    border-radius: 4px;
  }

  .preview-accent {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }

  .preview-glass {
    position: absolute;
    top: 8px;
    right: 8px;
    color: color-mix(in srgb, white 60%, transparent);
  }

  .theme-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-card);
  }

  .theme-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .theme-name {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
  }

  .theme-badge {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border-radius: 4px;
    line-height: 1.1;
  }

  .theme-actions {
    display: flex;
    gap: 4px;
  }

  .theme-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .theme-action-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .theme-action-btn.danger:hover {
    background: var(--error);
    color: white;
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .volume-control input[type='range'] {
    width: 100px;
    -webkit-appearance: none;
    height: 4px;
    background: var(--bg-card);
    border-radius: 2px;
    outline: none;
  }

  .volume-control input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: var(--accent);
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-value {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    min-width: 40px;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-card);
    border-radius: 26px;
    transition:
      background-color 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
  }

  .toggle-slider::before {
    position: absolute;
    content: '';
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background: var(--text-secondary);
    border-radius: 50%;
    transition:
      transform 0.2s,
      background-color 0.2s,
      opacity 0.2s;
  }

  .toggle input:checked + .toggle-slider {
    background: var(--accent);
  }

  .toggle input:checked + .toggle-slider::before {
    transform: translateX(22px);
    background: white;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--bg-card);
    color: var(--text-primary);
    border: none;
    border-radius: 8px;
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .action-btn:hover {
    background: var(--bg-primary);
  }

  .rotate-180 {
    transform: rotate(180deg);
  }

  .data-stats {
    background: var(--bg-card);
    border-radius: 8px;
    margin: 4px 16px;
  }

  .category-selection {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .category-actions {
    display: flex;
    gap: 8px;
  }

  .small-btn {
    padding: 4px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.2s;
  }

  .small-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .category-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .category-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.2s;
  }

  .category-checkbox:hover {
    border-color: var(--accent);
  }

  .category-checkbox input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-label {
    font-size: var(--text-xs);
    color: var(--text-primary);
  }

  .category-count {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .import-strategy {
    width: 100%;
  }

  .import-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .strategy-select {
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-xs);
    cursor: pointer;
    outline: none;
  }

  .strategy-select:focus {
    border-color: var(--accent);
  }

  .timeout-select {
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-xs);
    cursor: pointer;
    outline: none;
    min-width: 140px;
  }

  .timeout-select:focus {
    border-color: var(--accent);
  }

  .memory-actions {
    display: flex;
    gap: 8px;
  }

  .message-toast {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: var(--text-xs);
  }

  .message-toast.success {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    color: var(--success);
  }

  .message-toast.error {
    background: color-mix(in srgb, var(--error) 15%, transparent);
    color: var(--error);
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    z-index: 1000;
    padding: clamp(12px, 4vw, 20px);
  }

  .modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    max-width: min(500px, 100%);
    max-height: min(90vh, 920px);
    overflow-y: auto;
    padding: clamp(16px, 4vw, 24px);
    background: var(--bg-secondary);
    border-radius: 16px;
  }

  .theme-editor-modal {
    max-width: min(700px, 100%);
  }

  .modal-title {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group input {
    padding: 10px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .form-group input:focus {
    border-color: var(--accent);
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .editor-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .color-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .color-item label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .color-input-wrapper {
    display: flex;
    gap: 8px;
  }

  .color-input-wrapper input[type='color'] {
    width: 40px;
    height: 36px;
    padding: 2px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
  }

  .color-text-input {
    flex: 1;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: var(--text-xs);
    font-family: monospace;
  }

  .effect-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .effect-item.half {
    flex: 1;
  }

  .effect-item label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .effect-item input {
    padding: 10px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .effect-item input:focus {
    border-color: var(--accent);
  }

  .effect-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .effect-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  .effect-toggle span {
    font-size: var(--text-xs);
    color: var(--text-primary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .modal-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s,
      transform 0.2s;
  }

  .modal-btn.cancel {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .modal-btn.cancel:hover {
    background: var(--bg-primary);
  }

  .modal-btn.confirm {
    background: var(--accent);
    color: white;
  }

  .modal-btn.confirm:hover {
    background: var(--accent-hover);
  }

  @media (max-width: 768px) {
    .page-header {
      align-items: flex-start;
    }

    .section-header-row {
      gap: 12px;
      flex-wrap: wrap;
    }

    .setting-item {
      align-items: flex-start;
      gap: 12px;
    }

    .account-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .volume-control {
      width: 100%;
      justify-content: space-between;
    }

    .volume-control input[type='range'] {
      flex: 1;
      min-width: 0;
    }

    .theme-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .color-grid {
      grid-template-columns: 1fr;
    }

    .effect-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .page-header {
      gap: 12px;
    }

    .header-icon {
      width: 48px;
      height: 48px;
    }

    .page-title {
      font-size: var(--text-2xl);
    }

    .setting-item {
      flex-direction: column;
    }

    .account-actions,
    .category-actions,
    .memory-actions,
    .import-controls {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .theme-grid {
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .modal-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
  }

  @media (max-width: 480px) {
    .settings-view {
      gap: 20px;
    }

    .settings-sections {
      gap: 20px;
    }

    .settings-card {
      padding: 4px 0;
    }

    .setting-item {
      padding: 12px 16px;
    }

    .theme-grid {
      grid-template-columns: 1fr;
    }

    .color-input-wrapper {
      flex-direction: column;
    }

    .color-input-wrapper input[type='color'] {
      width: 100%;
      height: 40px;
    }
  }
</style>
