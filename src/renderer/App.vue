<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import MainLayout from '@/components/Layout/MainLayout.vue'
  import ToastContainer from '@/components/ui/ToastContainer.vue'
  import { usePlayerStore } from '@/stores/player'

  const playerStore = usePlayerStore()

  async function handleBeforeUnload() {
    await playerStore.saveCurrentPosition()
  }

  function focusMainContent() {
    const mainContent = document.querySelector('main.content-area') as HTMLElement | null

    if (!mainContent) return

    if (!mainContent.hasAttribute('tabindex')) {
      mainContent.setAttribute('tabindex', '-1')
    }

    mainContent.focus()
    mainContent.scrollIntoView({ block: 'start' })
  }

  onMounted(async () => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    // 加载持久化的用户播放队列
    await playerStore.loadUserQueue()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="focusMainContent">跳到主内容</a>
  <MainLayout>
    <router-view />
  </MainLayout>
  <ToastContainer />
</template>
