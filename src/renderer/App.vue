<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import MainLayout from '@/components/Layout/MainLayout.vue'
  import ToastContainer from '@/components/ui/ToastContainer.vue'
  import { usePlayerStore } from '@/stores/player'

  const playerStore = usePlayerStore()
  let removeNativePlayerCommandListener: (() => void) | null = null

  async function handleBeforeUnload() {
    await playerStore.saveCurrentPosition()
  }

  function handleNativePlayerCommand(command: NativePlayerCommand) {
    switch (command) {
      case 'togglePlay':
        playerStore.togglePlay()
        break
      case 'previous':
        playerStore.previous()
        break
      case 'next':
        playerStore.next()
        break
      case 'toggleMute':
        playerStore.toggleMute()
        break
    }
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
    removeNativePlayerCommandListener = window.electronAPI.nativePlayer.onCommand(
      handleNativePlayerCommand
    )
    // 加载持久化的用户播放队列
    await playerStore.loadUserQueue()
    playerStore.syncNativePlaybackState()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    removeNativePlayerCommandListener?.()
    removeNativePlayerCommandListener = null
  })
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="focusMainContent">跳到主内容</a>
  <MainLayout>
    <router-view />
  </MainLayout>
  <ToastContainer />
</template>
