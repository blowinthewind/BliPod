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

  function isPlaybackShortcutBlocked(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false

    return Boolean(
      target.closest(
        [
          'input',
          'textarea',
          'select',
          'button',
          'a',
          'summary',
          '[contenteditable="true"]',
          '[role="button"]',
          '[role="slider"]',
          '[role="dialog"]',
          '[aria-modal="true"]'
        ].join(', ')
      )
    )
  }

  function handlePlaybackShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || event.repeat || event.isComposing) return
    if (!document.hasFocus()) return
    if (isPlaybackShortcutBlocked(event.target)) return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    switch (event.code) {
      case 'Space':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.togglePlay()
        return
      case 'KeyJ':
        if (!playerStore.hasVideo || event.shiftKey) return
        event.preventDefault()
        playerStore.seekBackward(15)
        return
      case 'KeyL':
        if (!playerStore.hasVideo || event.shiftKey) return
        event.preventDefault()
        playerStore.seekForward(30)
        return
      case 'KeyM':
        if (!playerStore.hasVideo || event.shiftKey) return
        event.preventDefault()
        playerStore.toggleMute()
        return
      case 'KeyP':
        if (!event.shiftKey || !playerStore.hasPrevious) return
        event.preventDefault()
        playerStore.previous()
        return
      case 'KeyN':
        if (!event.shiftKey || !playerStore.hasNext) return
        event.preventDefault()
        playerStore.next()
        return
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
    window.addEventListener('keydown', handlePlaybackShortcut)
    removeNativePlayerCommandListener = window.electronAPI.nativePlayer.onCommand(
      handleNativePlayerCommand
    )
    // 加载持久化的用户播放队列
    await playerStore.loadUserQueue()
    playerStore.syncNativePlaybackState()
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('keydown', handlePlaybackShortcut)
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
