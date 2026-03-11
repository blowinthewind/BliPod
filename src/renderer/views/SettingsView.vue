<script setup lang="ts">
import { ref } from 'vue'
import { Settings, Moon, Sun, Palette, Volume2, Download, LogIn } from 'lucide-vue-next'

const currentTheme = ref<'light' | 'dark' | 'colorful'>('dark')
const volume = ref(80)
const autoPlay = ref(true)
const rememberPosition = ref(true)

const themes = [
  { id: 'light', name: '浅色', icon: Sun },
  { id: 'dark', name: '深色', icon: Moon },
  { id: 'colorful', name: '多彩', icon: Palette }
] as const

function setTheme(theme: typeof currentTheme.value) {
  currentTheme.value = theme
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
        <p class="page-desc">自定义你的BliPod体验</p>
      </div>
    </div>

    <div class="settings-sections">
      <section class="settings-section">
        <h2 class="section-title">账号</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">B站账号</span>
              <span class="setting-desc">登录以获取个性化推荐和完整功能</span>
            </div>
            <button class="login-btn">
              <LogIn :size="18" />
              登录B站
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">外观</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">主题</span>
              <span class="setting-desc">选择你喜欢的界面主题</span>
            </div>
            <div class="theme-options">
              <button
                v-for="theme in themes"
                :key="theme.id"
                class="theme-btn"
                :class="{ active: currentTheme === theme.id }"
                @click="setTheme(theme.id)"
              >
                <component :is="theme.icon" :size="18" />
                {{ theme.name }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">播放</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">默认音量</span>
              <span class="setting-desc">设置播放器的默认音量</span>
            </div>
            <div class="volume-control">
              <Volume2 :size="18" />
              <input type="range" min="0" max="100" v-model="volume" />
              <span class="volume-value">{{ volume }}%</span>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">自动播放</span>
              <span class="setting-desc">选择视频后自动开始播放</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="autoPlay" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">记住播放位置</span>
              <span class="setting-desc">下次打开时从上次位置继续播放</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="rememberPosition" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">数据</h2>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">导出数据</span>
              <span class="setting-desc">导出收藏和播放列表到本地文件</span>
            </div>
            <button class="action-btn">
              <Download :size="18" />
              导出
            </button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">导入数据</span>
              <span class="setting-desc">从本地文件导入收藏和播放列表</span>
            </div>
            <button class="action-btn">
              <Download :size="18" class="rotate-180" />
              导入
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
