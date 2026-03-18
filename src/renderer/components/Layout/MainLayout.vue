<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import Sidebar from './Sidebar.vue'
  import Header from './Header.vue'
  import PlayerBar from './PlayerBar.vue'
  import { usePlayerStore } from '../../stores/player'

  const playerStore = usePlayerStore()

  let playerUnsubscribe: (() => void) | null = null
  let progressUnsubscribe: (() => void) | null = null

  onMounted(() => {
    // 在全局布局中设置播放器事件监听器
    // 这样无论切换到哪个页面，playerbar 都能正常更新
    playerUnsubscribe = playerStore.setReadyListener()
    progressUnsubscribe = playerStore.setProgressListener()
  })

  onUnmounted(() => {
    if (playerUnsubscribe) {
      playerUnsubscribe()
    }
    if (progressUnsubscribe) {
      progressUnsubscribe()
    }
  })
</script>

<template>
  <div class="main-layout">
    <Sidebar />
    <div class="layout-content">
      <Header />
      <main id="main-content" class="content-area">
        <slot />
      </main>
    </div>
    <PlayerBar />
  </div>
</template>

<style scoped>
  .main-layout {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr auto;
    height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .layout-content {
    display: flex;
    flex-direction: column;
    grid-column: 2;
    grid-row: 1;
    overflow: hidden;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
  }

  .main-layout > :last-child {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  @media (max-width: 768px) {
    .main-layout {
      grid-template-columns: 1fr;
    }

    .layout-content {
      grid-column: 1;
    }

    .content-area {
      padding: 16px;
    }
  }
</style>
