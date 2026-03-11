<script setup lang="ts">
import { ref } from 'vue'

const message = ref('BliPod Vue 版本正在运行...')
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="logo">BliPod</div>
      <div class="url-input-container">
        <input type="text" class="url-input" placeholder="输入B站视频链接">
        <button class="load-btn">加载视频</button>
      </div>
    </header>

    <main class="main-container">
      <aside class="sidebar">
        <nav class="nav-menu">
          <a href="#" class="nav-item active">
            <span class="icon">🏠</span>
            <span class="label">首页</span>
          </a>
          <a href="#" class="nav-item">
            <span class="icon">🔍</span>
            <span class="label">搜索</span>
          </a>
          <a href="#" class="nav-item">
            <span class="icon">❤️</span>
            <span class="label">收藏</span>
          </a>
          <a href="#" class="nav-item">
            <span class="icon">📋</span>
            <span class="label">播放列表</span>
          </a>
        </nav>
      </aside>

      <section class="content">
        <div class="welcome">
          <h1>{{ message }}</h1>
          <p>Vue 3 + TypeScript + Vite 架构已就绪</p>
        </div>
      </section>
    </main>

    <footer class="player-bar">
      <div class="now-playing">
        <span class="track-title">等待播放...</span>
      </div>
      <div class="player-controls">
        <button class="control-btn">⏪</button>
        <button class="control-btn play-btn">▶</button>
        <button class="control-btn">⏩</button>
      </div>
      <div class="volume-control">
        <span>🔊</span>
        <input type="range" min="0" max="100" value="80">
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  gap: 16px;
  -webkit-app-region: drag;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: var(--accent);
}

.url-input-container {
  flex: 1;
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.url-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.url-input:focus {
  border-color: var(--accent);
}

.load-btn {
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-btn:hover {
  background: var(--accent-hover);
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 16px 0;
}

.nav-menu {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-card);
  color: var(--accent);
  border-left: 3px solid var(--accent);
}

.nav-item .icon {
  margin-right: 12px;
  font-size: 18px;
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.welcome {
  text-align: center;
}

.welcome h1 {
  font-size: 24px;
  margin-bottom: 12px;
}

.welcome p {
  color: var(--text-secondary);
}

.player-bar {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  gap: 24px;
}

.now-playing {
  flex: 1;
}

.track-title {
  color: var(--text-secondary);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--accent);
}

.control-btn.play-btn {
  width: 48px;
  height: 48px;
  background: var(--accent);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 150px;
}

.volume-control input {
  flex: 1;
}
</style>
