<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore, type ThemeId } from '@/stores/theme'
import { Settings, Moon, Sun, Palette, Volume2, Download, LogIn } from 'lucide-vue-next'

const themeStore = useThemeStore()

const volume = ref(80)
const autoPlay = ref(true)
const rememberPosition = ref(true)

const themeOptions = [
  { id: 'light' as ThemeId, name: 'Light', icon: Sun },
  { id: 'dark' as ThemeId, name: 'Dark', icon: Moon },
  { id: 'colorful' as ThemeId, name: 'Colorful', icon: Palette }
]

function setTheme(themeId: ThemeId) {
  themeStore.setTheme(themeId)
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
            <div class="theme-options">
              <button
                v-for="option in themeOptions"
                :key="option.id"
                class="theme-btn"
                :class="{ active: themeStore.currentThemeId === option.id }"
                @click="setTheme(option.id)"
              >
                <component :is="option.icon" :size="18" />
                {{ option.name }}
              </button>
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
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
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

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover {
  color: var(--text-primary);
}

.theme-btn.active {
  border-color: var(--accent);
  color: var(--accent);
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
</style>
