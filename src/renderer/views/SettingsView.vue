<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore, type Theme } from '@/stores/theme'
import { Settings, Volume2, Download, LogIn, Plus, Trash2 } from 'lucide-vue-next'

const themeStore = useThemeStore()

const volume = ref(80)
const autoPlay = ref(true)
const rememberPosition = ref(true)
const showCreateTheme = ref(false)

const newTheme = ref<Partial<Theme>>({
  id: '',
  name: '',
  colors: {
    bgPrimary: '#0d0d0d',
    bgSecondary: '#141414',
    bgCard: '#1a1a1a',
    bgElevated: '#242424',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    accent: '#e94560',
    accentHover: '#ff6b6b',
    border: '#2d2d2d'
  }
})

function setTheme(themeId: string) {
  themeStore.setTheme(themeId)
}

function createCustomTheme() {
  if (!newTheme.value.id || !newTheme.value.name) return
  
  themeStore.addCustomTheme({
    id: newTheme.value.id,
    name: newTheme.value.name,
    description: 'Custom theme',
    colors: newTheme.value.colors as Theme['colors']
  })
  
  showCreateTheme.value = false
  newTheme.value = {
    id: '',
    name: '',
    colors: {
      bgPrimary: '#0d0d0d',
      bgSecondary: '#141414',
      bgCard: '#1a1a1a',
      bgElevated: '#242424',
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      accent: '#e94560',
      accentHover: '#ff6b6b',
      border: '#2d2d2d'
    }
  }
}

function deleteTheme(themeId: string) {
  themeStore.removeCustomTheme(themeId)
}
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <div class="header-icon">
        <Settings :size="24" />
      </div>
      <div class="header-text">
        <h1 class="page-title">Settings</h1>
        <p class="page-desc">Customize your BliPod experience</p>
      </div>
    </div>

    <div class="settings-sections">
      <section class="settings-section">
        <h2 class="section-title">Account</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Bilibili Account</span>
              <span class="setting-desc">Login to get personalized recommendations and full features</span>
            </div>
            <button class="login-btn">
              <LogIn :size="18" />
              Login
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">Appearance</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-desc">Choose your preferred interface theme</span>
            </div>
            <button class="add-theme-btn" @click="showCreateTheme = true">
              <Plus :size="16" />
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
              <div class="theme-preview" :style="{ background: theme.colors.bgPrimary }">
                <div class="preview-sidebar" :style="{ background: theme.colors.bgSecondary }"></div>
                <div class="preview-accent" :style="{ background: theme.colors.accent }"></div>
              </div>
              <div class="theme-info">
                <span class="theme-name">{{ theme.name }}</span>
                <button 
                  v-if="!theme.isBuiltIn" 
                  class="delete-theme-btn"
                  @click.stop="deleteTheme(theme.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">Playback</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Default Volume</span>
              <span class="setting-desc">Set the default player volume</span>
            </div>
            <div class="volume-control">
              <Volume2 :size="18" />
              <input type="range" min="0" max="100" v-model="volume" />
              <span class="volume-value">{{ volume }}%</span>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Auto Play</span>
              <span class="setting-desc">Start playback automatically when selecting a video</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="autoPlay" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Remember Position</span>
              <span class="setting-desc">Resume from where you left off next time</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="rememberPosition" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">Data</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Export Data</span>
              <span class="setting-desc">Export favorites and playlists to local file</span>
            </div>
            <button class="action-btn">
              <Download :size="18" />
              Export
            </button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Import Data</span>
              <span class="setting-desc">Import favorites and playlists from local file</span>
            </div>
            <button class="action-btn">
              <Download :size="18" class="rotate-180" />
              Import
            </button>
          </div>
        </div>
      </section>
    </div>

    <div class="modal-overlay" v-if="showCreateTheme" @click.self="showCreateTheme = false">
      <div class="modal">
        <h2 class="modal-title">Create Custom Theme</h2>
        <div class="modal-content">
          <div class="form-group">
            <label>Theme ID</label>
            <input type="text" v-model="newTheme.id" placeholder="my-theme" />
          </div>
          <div class="form-group">
            <label>Theme Name</label>
            <input type="text" v-model="newTheme.name" placeholder="My Theme" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showCreateTheme = false">Cancel</button>
          <button class="modal-btn confirm" @click="createCustomTheme">Create</button>
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
  max-width: 800px;
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
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-desc {
  font-size: 14px;
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  padding-left: 4px;
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
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-secondary);
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover {
  background: var(--accent-hover);
}

.add-theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-theme-btn:hover {
  background: var(--accent);
  color: white;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 0 20px 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.theme-card:hover {
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: var(--accent);
}

.theme-preview {
  position: relative;
  height: 80px;
  display: flex;
  padding: 8px;
  gap: 4px;
}

.preview-sidebar {
  width: 30%;
  border-radius: 4px;
}

.preview-accent {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.theme-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
}

.theme-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.delete-theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-theme-btn:hover {
  background: var(--error);
  color: white;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-control input[type="range"] {
  width: 100px;
  -webkit-appearance: none;
  height: 4px;
  background: var(--bg-card);
  border-radius: 2px;
  outline: none;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}

.volume-value {
  font-size: 13px;
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
  transition: all 0.2s;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.2s;
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
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-primary);
}

.rotate-180 {
  transform: rotate(180deg);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 400px;
  max-width: 90vw;
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.form-group input:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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
</style>
