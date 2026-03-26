<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, toRaw } from 'vue'
  import { useThemeStore } from '@/stores/theme'
  import {
    THEME_COLOR_GROUPS,
    THEME_EFFECT_GROUPS,
    cloneTheme,
    createCustomThemeDraft,
    type Theme,
    type ThemeColorKey,
    type ThemeEffectKey,
    type ThemeEffects
  } from '../../shared/theme'
  import { useAuthStore } from '@/stores/auth'
  import { useFavoritesStore } from '@/stores/favorites'
  import { usePlaylistsStore } from '@/stores/playlists'
  import { usePlayerStore } from '@/stores/player'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import { useRuntimeConfigStore } from '@/stores/runtimeConfig'
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
    MemoryStick,
    Github,
    User,
    Play,
    Database,
    Info,
    X
  } from 'lucide-vue-next'
  import LoginDialog from '@/components/Layout/LoginDialog.vue'
  import Button from '@/components/ui/Button.vue'
  import { useDialogFocusTrap } from '@/composables/useDialogFocusTrap'
  import { logger } from '@/utils/logger'
  import packageJson from '../../../package.json'

  const themeStore = useThemeStore()
  const authStore = useAuthStore()
  const favoritesStore = useFavoritesStore()
  const playlistsStore = usePlaylistsStore()
  const playerStore = usePlayerStore()
  const appSettingsStore = useAppSettingsStore()
  const runtimeConfigStore = useRuntimeConfigStore()

  const autoPlay = computed({
    get: () => appSettingsStore.autoPlay,
    set: (value) => appSettingsStore.setAutoPlay(value)
  })
  const rememberPosition = computed({
    get: () => appSettingsStore.rememberPosition,
    set: (value) => appSettingsStore.setRememberPosition(value)
  })
  const showMemoryStatusEntry = computed(() => runtimeConfigStore.ui.memory.showStatus)
  const showSearchViewTimeoutControl = computed(() => runtimeConfigStore.ui.memory.showSearchViewTimeoutControl)
  const showCreateThemeEntry = computed(() => runtimeConfigStore.ui.theme.showCreate)
  const showDuplicateThemeEntry = computed(() => runtimeConfigStore.ui.theme.showDuplicate)
  const showCreateTheme = ref(false)
  const showEditTheme = ref(false)
  const showLoginDialog = ref(false)
  const editingThemeId = ref<string | null>(null)
  const createThemeIdInputRef = ref<HTMLInputElement | null>(null)
  const editThemeNameInputRef = ref<HTMLInputElement | null>(null)
  const createThemeDialogRef = ref<HTMLDivElement | null>(null)
  const editThemeDialogRef = ref<HTMLDivElement | null>(null)

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
  const defaultSearchViewTimeoutMinutes = computed(
    () => runtimeConfigStore.behavior.memory.searchViewIdleTimeoutMinutes
  )
  const defaultSearchViewTimeoutMs = computed(() => defaultSearchViewTimeoutMinutes.value * 60 * 1000)
  const memoryTimeoutOptions = computed(() => {
    const options = [5, 10, 15, 20, 30]
    return options.includes(defaultSearchViewTimeoutMinutes.value)
      ? options
      : [...options, defaultSearchViewTimeoutMinutes.value].sort((a, b) => a - b)
  })
  const appVersion = packageJson.version
  const appLicense = packageJson.license
  const projectUrl =
    typeof packageJson.repository === 'object' ? packageJson.repository.url : packageJson.repository ?? ''

  const memorySettings = ref({
    searchViewTimeout: defaultSearchViewTimeoutMs.value,
    cleanupMessage: '' as string | null
  })

  const showMemoryStatsDialog = ref(false)
  const memoryStatsViewBtnRef = ref<HTMLButtonElement | null>(null)
  const memoryStatsDialogRef = ref<HTMLDivElement | null>(null)
  const memoryStatsCloseBtnRef = ref<HTMLButtonElement | null>(null)
  const memoryStatsData = ref<{
    heapUsed: number
    heapTotal: number
    rss: number
    searchViewActive: boolean
    playerViewActive: boolean
  } | null>(null)
  const memoryStatsError = ref<string | null>(null)

  const { handleKeydown: handleMemoryStatsDialogKeydown } = useDialogFocusTrap({
    open: showMemoryStatsDialog,
    containerRef: memoryStatsDialogRef,
    initialFocusRef: memoryStatsCloseBtnRef,
    restoreFocusRef: memoryStatsViewBtnRef,
    onClose: () => { showMemoryStatsDialog.value = false }
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

  async function loadCategoryStats() {
    try {
      const stats = await window.electronAPI.store.getCategoryStats()
      categoryStats.value = stats
      selectedExportCategories.value = stats.map((s) => s.key)
    } catch (error) {
      logger.error(
        'Failed to load category stats',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

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
      exportMessage.value = { type: 'error', text: '请至少选择一个数据分类' }
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
          text: `已导出到 ${result.filePath?.split('/').pop()}`
        }
        showExportOptions.value = false
      } else if (result.error === 'Export cancelled') {
        showExportOptions.value = false
      } else {
        exportMessage.value = { type: 'error', text: result.error || '导出失败' }
      }
    } catch (error) {
      exportMessage.value = {
        type: 'error',
        text: error instanceof Error ? error.message : '导出失败'
      }
    } finally {
      isExporting.value = false
      setTimeout(() => {
        exportMessage.value = null
      }, 5000)
    }
  }

  async function openProjectRepository() {
    if (!projectUrl) return
    await window.electronAPI.config.openExternal(projectUrl)
  }

  async function handleImport() {
    if (selectedImportCategories.value.length === 0) {
      importMessage.value = { type: 'error', text: '请至少选择一个数据分类' }
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
          text: statsText || '导入完成'
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
        importMessage.value = { type: 'error', text: result.error || '导入失败' }
      }
    } catch (error) {
      importMessage.value = {
        type: 'error',
        text: error instanceof Error ? error.message : '导入失败'
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

  type EditableTheme = Theme & { effects: ThemeEffects }

  const themeColorGroups = THEME_COLOR_GROUPS
  const themeEffectGroups = THEME_EFFECT_GROUPS
  const visibleThemes = computed(() => themeStore.allThemes.filter((theme) => theme.id !== 'glass'))
  const newTheme = ref<EditableTheme>(createCustomThemeDraft())
  const editingTheme = ref<EditableTheme | null>(null)

  function createEditableTheme(theme: Theme): EditableTheme {
    const clonedTheme = cloneTheme(theme)
    return {
      ...clonedTheme,
      effects: clonedTheme.effects ? { ...clonedTheme.effects } : {}
    }
  }

  function isHexColor(value?: string): value is string {
    return /^#[0-9a-fA-F]{6}$/.test(value ?? '')
  }

  function getThemeColorValue(theme: EditableTheme, key: ThemeColorKey): string {
    return theme.colors[key] ?? ''
  }

  function canUseColorPicker(theme: EditableTheme, key: ThemeColorKey): boolean {
    return isHexColor(theme.colors[key])
  }

  function getThemeEffectTextValue(theme: EditableTheme, key: ThemeEffectKey): string {
    const value = theme.effects[key]
    return typeof value === 'string' ? value : ''
  }

  function getThemeEffectNumberValue(theme: EditableTheme, key: ThemeEffectKey): number | '' {
    const value = theme.effects[key]
    return typeof value === 'number' ? value : ''
  }

  function getThemeEffectBooleanValue(theme: EditableTheme, key: ThemeEffectKey): boolean {
    return theme.effects[key] === true
  }

  function isWideEffectToken(key: ThemeEffectKey): boolean {
    return key === 'bgGradient' || key === 'bgImage'
  }

  function updateThemeColor(theme: EditableTheme, key: ThemeColorKey, value: string) {
    theme.colors[key] = value
  }

  function updateThemeTextEffect(theme: EditableTheme, key: ThemeEffectKey, value: string) {
    if (!value) {
      delete theme.effects[key]
      return
    }

    theme.effects[key] = value as never
  }

  function updateThemeNumberEffect(theme: EditableTheme, key: ThemeEffectKey, value: string) {
    if (value === '') {
      delete theme.effects[key]
      return
    }

    theme.effects[key] = Number(value) as never
  }

  function updateThemeBooleanEffect(theme: EditableTheme, key: ThemeEffectKey, value: boolean) {
    if (!value) {
      delete theme.effects[key]
      return
    }

    theme.effects[key] = value as never
  }

  function isEffectTokenVisible(theme: EditableTheme, key: ThemeEffectKey): boolean {
    if ((key === 'glassBlur' || key === 'glassOpacity') && !theme.effects.glassEffect) {
      return false
    }

    return true
  }


  async function setTheme(themeId: string) {
    await appSettingsStore.setCurrentThemeId(themeId)
  }

  function openCreateTheme() {
    newTheme.value = createCustomThemeDraft()
    showCreateTheme.value = true
  }

  function closeCreateTheme() {
    showCreateTheme.value = false
  }

  async function createCustomTheme() {
    if (!newTheme.value.id || !newTheme.value.name) return

    const success = await appSettingsStore.addCustomTheme({
      id: newTheme.value.id,
      name: newTheme.value.name,
      description: newTheme.value.description || '自定义主题',
      colors: newTheme.value.colors,
      effects: Object.keys(newTheme.value.effects).length > 0 ? newTheme.value.effects : undefined
    })

    if (success) {
      showCreateTheme.value = false
    }
  }

  function openEditTheme(themeId: string) {
    const theme = themeStore.allThemes.find((t) => t.id === themeId)
    if (theme && !theme.isBuiltIn) {
      editingTheme.value = createEditableTheme(theme)
      editingThemeId.value = themeId
      showEditTheme.value = true
    }
  }

  function closeEditTheme() {
    showEditTheme.value = false
    editingTheme.value = null
    editingThemeId.value = null
  }

  async function saveEditedTheme() {
    if (editingTheme.value && editingThemeId.value) {
      const success = await appSettingsStore.updateCustomTheme(editingThemeId.value, {
        name: editingTheme.value.name,
        description: editingTheme.value.description,
        colors: editingTheme.value.colors,
        effects: editingTheme.value.effects
      })

      if (success) {
        showEditTheme.value = false
        editingTheme.value = null
        editingThemeId.value = null
      }
    }
  }

  const { handleKeydown: handleCreateThemeKeydown } = useDialogFocusTrap({
    open: showCreateTheme,
    containerRef: createThemeDialogRef,
    initialFocusRef: createThemeIdInputRef,
    onClose: closeCreateTheme
  })

  const { handleKeydown: handleEditThemeKeydown } = useDialogFocusTrap({
    open: showEditTheme,
    containerRef: editThemeDialogRef,
    initialFocusRef: editThemeNameInputRef,
    onClose: closeEditTheme
  })

  async function deleteTheme(themeId: string) {
    await appSettingsStore.removeCustomTheme(themeId)
  }

  async function duplicateTheme(themeId: string) {
    const newId = `${themeId}-copy-${Date.now()}`
    const source = themeStore.allThemes.find((t) => t.id === themeId)
    if (source) {
      await appSettingsStore.duplicateTheme(themeId, newId, `${source.name} Copy`)
    }
  }

  function getThemePreviewStyle(theme: Theme) {
    if (theme.effects?.bgImage) {
      const opacity = theme.effects.bgImageOpacity ?? 1
      return {
        background: `linear-gradient(rgba(0, 0, 0, ${1 - opacity}), rgba(0, 0, 0, ${1 - opacity})), url('${theme.effects.bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    }

    if (theme.effects?.bgGradient) {
      return { background: theme.effects.bgGradient }
    }

    return { background: theme.colors.bgPrimary }
  }

  function getThemePreviewSurfaceStyle(theme: Theme, fallbackColor: string) {
    const style: Record<string, string> = {
      background: theme.effects?.glassEffect ? (theme.colors.glassBg ?? fallbackColor) : fallbackColor
    }

    if (theme.effects?.glassEffect && theme.colors.glassBorder) {
      style.border = `1px solid ${theme.colors.glassBorder}`
    }

    if (theme.effects?.glassEffect && theme.effects.glassBlur) {
      style.backdropFilter = `blur(${theme.effects.glassBlur})`
      style.webkitBackdropFilter = `blur(${theme.effects.glassBlur})`
    }

    return style
  }

  function getThemePreviewGlassStyle(theme: Theme) {
    return {
      color: theme.colors.textPrimary,
      opacity: '0.72'
    }
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

  function getMemoryTimeoutOptionLabel(minutes: number) {
    return minutes === defaultSearchViewTimeoutMinutes.value ? `${minutes} 分钟（默认）` : `${minutes} 分钟`
  }

  // 加载内存管理设置
  function loadMemorySettings() {
    try {
      const stored = localStorage.getItem('blipod_memory_settings')
      if (!stored) {
        memorySettings.value.searchViewTimeout = defaultSearchViewTimeoutMs.value
        return
      }

      const parsed = JSON.parse(stored)
      memorySettings.value.searchViewTimeout =
        typeof parsed.searchViewTimeout === 'number' && parsed.searchViewTimeout > 0
          ? parsed.searchViewTimeout
          : defaultSearchViewTimeoutMs.value
    } catch {
      memorySettings.value.searchViewTimeout = defaultSearchViewTimeoutMs.value
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
    } catch {
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
    } catch {
      memorySettings.value.cleanupMessage = '清理失败'
    }
  }

  // 显示内存状态
  async function showMemoryStats() {
    memoryStatsData.value = null
    memoryStatsError.value = null
    showMemoryStatsDialog.value = true
    try {
      const stats = await window.electronAPI.memory.getStats()
      memoryStatsData.value = stats
    } catch {
      memoryStatsError.value = '获取内存状态失败'
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
        <p class="page-desc">按你的收听习惯调整 BliPod</p>
      </div>
    </div>

    <div class="settings-sections">
      <section class="settings-section">
        <h2 class="section-title">
          <User :size="18" />
          账号
        </h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">哔哩哔哩账号</span>
              <span class="setting-desc" v-if="authStore.isLoggedIn && authStore.userInfo">
                当前登录：{{ authStore.userInfo.name }}
              </span>
              <span class="setting-desc" v-else>
                登录后可获得更流畅的使用体验
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
                <Button variant="outline" size="sm" @click="handleLogout">
                  <LogOut :size="16" />
                  退出登录
                </Button>
              </template>
              <template v-else>
                <Button @click="openLoginDialog">
                  <LogIn :size="18" />
                  登录
                </Button>
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
          <Button v-if="showCreateThemeEntry" size="sm" @click="openCreateTheme">
            <Plus :size="16" />
            新建主题
          </Button>
        </div>

        <div class="theme-grid">
          <div
            v-for="theme in visibleThemes"
            :key="theme.id"
            class="theme-card"
            :class="{ active: appSettingsStore.currentThemeId === theme.id }"
            @click="setTheme(theme.id)"
          >
            <div class="theme-preview" :style="getThemePreviewStyle(theme)">
              <div
                class="preview-sidebar"
                :style="getThemePreviewSurfaceStyle(theme, theme.colors.bgSecondary)"
              ></div>
              <div class="preview-card" :style="getThemePreviewSurfaceStyle(theme, theme.colors.bgCard)"></div>
              <div class="preview-accent" :style="{ background: theme.colors.accent }"></div>
              <div v-if="theme.effects?.glassEffect" class="preview-glass" :style="getThemePreviewGlassStyle(theme)">
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
                  v-if="showDuplicateThemeEntry"
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
              <div class="theme-actions" v-else-if="showDuplicateThemeEntry">
                <button
                  v-if="showDuplicateThemeEntry"
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
        <h2 class="section-title">
          <Play :size="18" />
          播放
        </h2>
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
          <div v-if="showSearchViewTimeoutControl" class="setting-item">
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
              <option v-for="minutes in memoryTimeoutOptions" :key="minutes" :value="minutes * 60 * 1000">
                {{ getMemoryTimeoutOptionLabel(minutes) }}
              </option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">内存状态</span>
              <span class="setting-desc">清理内存</span>
              <div v-if="memorySettings.cleanupMessage && !showSearchViewTimeoutControl" class="message-toast success">
                <Check :size="14" />
                {{ memorySettings.cleanupMessage }}
              </div>
            </div>
            <div class="memory-actions">
              <Button
                v-if="showMemoryStatusEntry"
                ref="memoryStatsViewBtnRef"
                variant="secondary"
                size="sm"
                @click="showMemoryStats"
                >查看状态</Button
              >
              <Button variant="secondary" size="sm" @click="cleanupMemoryNow">立即清理</Button>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">
          <Database :size="18" />
          数据
        </h2>
        <div class="settings-card">
          <div class="setting-item category-selection">
            <div class="setting-info">
              <div class="category-header">
                <span class="setting-label">导出数据</span>
                <div class="category-actions" v-if="showExportOptions">
                  <Button variant="secondary" size="sm" @click="selectAllExportCategories">全选</Button>
                  <Button variant="secondary" size="sm" @click="deselectAllExportCategories">取消全选</Button>
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
            <Button variant="secondary" size="sm" :disabled="isExporting" @click="handleExportAction">
              <Download :size="18" :class="{ 'animate-spin': isExporting }" />
              {{ isExporting ? '正在导出...' : showExportOptions ? '导出已选内容' : '导出' }}
            </Button>
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
            <Button variant="secondary" size="sm" :disabled="isImporting" @click="handleImportAction">
              <Upload :size="18" :class="{ 'animate-spin': isImporting }" />
              {{ isImporting ? '正在导入...' : showImportOptions ? '导入已选内容' : '导入' }}
            </Button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">
          <Info :size="18" />
          关于 BliPod
        </h2>
        <div class="settings-card">
          <div class="setting-item about-item">
            <div class="setting-info">
              <span class="setting-label">当前版本</span>
              <span class="setting-desc">{{ appVersion }}</span>
            </div>
          </div>

          <div class="setting-item about-item">
            <div class="setting-info">
              <span class="setting-label">项目地址</span>
              <span class="setting-desc">在默认浏览器中打开项目主页</span>
            </div>
            <Button variant="secondary" size="sm" @click="openProjectRepository">
              <Github :size="16" />
              GitHub
            </Button>
          </div>

          <div class="setting-item about-item">
            <div class="setting-info">
              <span class="setting-label">LICENSE</span>
              <span class="setting-desc">{{ appLicense }}</span>
            </div>
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
            <div class="editor-group" v-for="group in themeColorGroups" :key="`create-${group.id}`">
              <h4 class="editor-group-title">{{ group.label }}</h4>
              <div class="editor-grid">
                <div
                  v-for="token in group.tokens"
                  :key="`create-${group.id}-${token.key}`"
                  class="editor-field"
                >
                  <label :for="`create-color-text-${token.key}`">{{ token.label }}</label>
                  <div class="color-input-wrapper" :class="{ compact: !canUseColorPicker(newTheme, token.key) }">
                    <input
                      v-if="canUseColorPicker(newTheme, token.key)"
                      type="color"
                      :value="getThemeColorValue(newTheme, token.key)"
                      @input="updateThemeColor(newTheme, token.key, ($event.target as HTMLInputElement).value)"
                    />
                    <input
                      :id="`create-color-text-${token.key}`"
                      type="text"
                      :value="getThemeColorValue(newTheme, token.key)"
                      @input="updateThemeColor(newTheme, token.key, ($event.target as HTMLInputElement).value)"
                      class="color-text-input"
                      placeholder="#000000"
                    />
                  </div>
                  <p v-if="!canUseColorPicker(newTheme, token.key)" class="field-note">
                    当前值不是 6 位 HEX，请用文本输入编辑。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Sparkles :size="16" />
              效果
            </h3>
            <div class="editor-group" v-for="group in themeEffectGroups" :key="`create-${group.id}`">
              <h4 class="editor-group-title">{{ group.label }}</h4>
              <div class="editor-grid effect-grid">
                <template v-for="token in group.tokens" :key="`create-${group.id}-${token.key}`">
                  <div
                    v-if="isEffectTokenVisible(newTheme, token.key)"
                    class="editor-field"
                    :class="{ wide: isWideEffectToken(token.key), 'toggle-field': token.input === 'boolean' }"
                  >
                    <template v-if="token.input === 'boolean'">
                      <div class="effect-toggle">
                        <label class="toggle">
                          <input
                            type="checkbox"
                            :checked="getThemeEffectBooleanValue(newTheme, token.key)"
                            @change="
                              updateThemeBooleanEffect(
                                newTheme,
                                token.key,
                                ($event.target as HTMLInputElement).checked
                              )
                            "
                          />
                          <span class="toggle-slider"></span>
                        </label>
                        <span class="effect-toggle-label">{{ token.label }}</span>
                      </div>
                    </template>
                    <template v-else>
                      <label :for="`create-effect-${token.key}`">{{ token.label }}</label>
                      <input
                        v-if="token.input === 'number'"
                        :id="`create-effect-${token.key}`"
                        type="number"
                        :value="getThemeEffectNumberValue(newTheme, token.key)"
                        @input="
                          updateThemeNumberEffect(
                            newTheme,
                            token.key,
                            ($event.target as HTMLInputElement).value
                          )
                        "
                        min="0"
                        max="1"
                        step="0.1"
                        :placeholder="token.placeholder"
                      />
                      <input
                        v-else
                        :id="`create-effect-${token.key}`"
                        type="text"
                        :value="getThemeEffectTextValue(newTheme, token.key)"
                        @input="
                          updateThemeTextEffect(
                            newTheme,
                            token.key,
                            ($event.target as HTMLInputElement).value
                          )
                        "
                        :placeholder="token.placeholder"
                      />
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <Button variant="secondary" type="button" @click="closeCreateTheme">取消</Button>
          <Button variant="default" type="button" @click="createCustomTheme">
            创建主题
          </Button>
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
            <div class="editor-group" v-for="group in themeColorGroups" :key="`edit-${group.id}`">
              <h4 class="editor-group-title">{{ group.label }}</h4>
              <div class="editor-grid">
                <div
                  v-for="token in group.tokens"
                  :key="`edit-${group.id}-${token.key}`"
                  class="editor-field"
                >
                  <label :for="`edit-color-text-${token.key}`">{{ token.label }}</label>
                  <div
                    class="color-input-wrapper"
                    :class="{ compact: !canUseColorPicker(editingTheme!, token.key) }"
                  >
                    <input
                      v-if="canUseColorPicker(editingTheme!, token.key)"
                      type="color"
                      :value="getThemeColorValue(editingTheme!, token.key)"
                      @input="
                        updateThemeColor(editingTheme!, token.key, ($event.target as HTMLInputElement).value)
                      "
                    />
                    <input
                      :id="`edit-color-text-${token.key}`"
                      type="text"
                      :value="getThemeColorValue(editingTheme!, token.key)"
                      @input="
                        updateThemeColor(editingTheme!, token.key, ($event.target as HTMLInputElement).value)
                      "
                      class="color-text-input"
                      placeholder="#000000"
                    />
                  </div>
                  <p v-if="!canUseColorPicker(editingTheme!, token.key)" class="field-note">
                    当前值不是 6 位 HEX，请用文本输入编辑。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="editor-section">
            <h3 class="editor-section-title">
              <Sparkles :size="16" />
              效果
            </h3>
            <div class="editor-group" v-for="group in themeEffectGroups" :key="`edit-${group.id}`">
              <h4 class="editor-group-title">{{ group.label }}</h4>
              <div class="editor-grid effect-grid">
                <template v-for="token in group.tokens" :key="`edit-${group.id}-${token.key}`">
                  <div
                    v-if="isEffectTokenVisible(editingTheme!, token.key)"
                    class="editor-field"
                    :class="{ wide: isWideEffectToken(token.key), 'toggle-field': token.input === 'boolean' }"
                  >
                    <template v-if="token.input === 'boolean'">
                      <div class="effect-toggle">
                        <label class="toggle">
                          <input
                            type="checkbox"
                            :checked="getThemeEffectBooleanValue(editingTheme!, token.key)"
                            @change="
                              updateThemeBooleanEffect(
                                editingTheme!,
                                token.key,
                                ($event.target as HTMLInputElement).checked
                              )
                            "
                          />
                          <span class="toggle-slider"></span>
                        </label>
                        <span class="effect-toggle-label">{{ token.label }}</span>
                      </div>
                    </template>
                    <template v-else>
                      <label :for="`edit-effect-${token.key}`">{{ token.label }}</label>
                      <input
                        v-if="token.input === 'number'"
                        :id="`edit-effect-${token.key}`"
                        type="number"
                        :value="getThemeEffectNumberValue(editingTheme!, token.key)"
                        @input="
                          updateThemeNumberEffect(
                            editingTheme!,
                            token.key,
                            ($event.target as HTMLInputElement).value
                          )
                        "
                        min="0"
                        max="1"
                        step="0.1"
                        :placeholder="token.placeholder"
                      />
                      <input
                        v-else
                        :id="`edit-effect-${token.key}`"
                        type="text"
                        :value="getThemeEffectTextValue(editingTheme!, token.key)"
                        @input="
                          updateThemeTextEffect(
                            editingTheme!,
                            token.key,
                            ($event.target as HTMLInputElement).value
                          )
                        "
                        :placeholder="token.placeholder"
                      />
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <Button variant="secondary" type="button" @click="closeEditTheme">取消</Button>
          <Button variant="default" type="button" @click="saveEditedTheme">保存修改</Button>
        </div>
      </div>
    </div>
  </div>

  <div class="memory-stats-overlay" v-if="showMemoryStatsDialog" @click.self="showMemoryStatsDialog = false">
    <div
      ref="memoryStatsDialogRef"
      class="memory-stats-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-stats-title"
      @keydown="handleMemoryStatsDialogKeydown"
    >
      <div class="memory-stats-header">
        <h2 id="memory-stats-title" class="memory-stats-title">内存状态</h2>
        <button
          ref="memoryStatsCloseBtnRef"
          class="memory-stats-close-btn"
          type="button"
          aria-label="关闭内存状态弹窗"
          @click="showMemoryStatsDialog = false"
        >
          <X :size="18" />
        </button>
      </div>
      <div v-if="memoryStatsData" class="memory-stats-content">
        <div class="stats-row">
          <span class="stats-label">堆内存</span>
          <span class="stats-value">{{ memoryStatsData.heapUsed }}MB / {{ memoryStatsData.heapTotal }}MB</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">RSS</span>
          <span class="stats-value">{{ memoryStatsData.rss }}MB</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">SearchView</span>
          <span class="stats-value">{{ memoryStatsData.searchViewActive ? '活跃' : '未创建' }}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">PlayerView</span>
          <span class="stats-value">{{ memoryStatsData.playerViewActive ? '活跃' : '未创建' }}</span>
        </div>
      </div>
      <p v-else-if="memoryStatsError" class="memory-stats-message">{{ memoryStatsError }}</p>
      <p v-else class="memory-stats-message">加载中…</p>
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
    background: var(--accent-muted);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
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

  .about-item {
    align-items: flex-start;
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
    display: inline-flex;
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
    color: var(--text-on-error);
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

  .rotate-180 {
    transform: rotate(180deg);
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

  .editor-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
  }

  .editor-group-title {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }

  .editor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .effect-grid {
    align-items: start;
  }

  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .editor-field.wide {
    grid-column: 1 / -1;
  }

  .editor-field.toggle-field {
    justify-content: center;
  }

  .editor-field label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .editor-field input {
    padding: 10px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: var(--text-sm);
    outline: none;
  }

  .editor-field input:focus {
    border-color: var(--accent);
  }

  .field-note {
    font-size: 11px;
    line-height: 1.4;
    color: var(--text-tertiary, var(--text-secondary));
  }


  .color-input-wrapper {
    display: flex;
    gap: 8px;
  }

  .color-input-wrapper.compact {
    display: block;
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

  .effect-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  .effect-toggle-label {
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

    .editor-grid {
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

  .memory-stats-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    z-index: 1000;
  }

  .memory-stats-dialog {
    display: flex;
    flex-direction: column;
    width: min(320px, calc(100% - 32px));
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .memory-stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .memory-stats-title {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .memory-stats-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .memory-stats-close-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .memory-stats-content {
    display: flex;
    flex-direction: column;
    padding: 12px 20px 20px;
    gap: 4px;
  }

  .memory-stats-message {
    padding: 20px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: center;
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  .stats-row:last-child {
    border-bottom: none;
  }

  .stats-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .stats-value {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
  }
</style>
