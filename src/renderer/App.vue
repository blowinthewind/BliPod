<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import MainLayout from '@/components/Layout/MainLayout.vue'
  import ToastContainer from '@/components/ui/ToastContainer.vue'
  import { usePlayerStore } from '@/stores/player'

  const playerStore = usePlayerStore()

  async function handleBeforeUnload() {
    await playerStore.saveCurrentPosition()
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
  <MainLayout>
    <router-view />
  </MainLayout>
  <ToastContainer />
</template>
