<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import MainLayout from '@/components/Layout/MainLayout.vue'
  import ToastContainer from '@/components/ui/ToastContainer.vue'
  import { usePlayerStore } from '@/stores/player'
  import { useNavigationStore } from '@/stores/navigation'

  const router = useRouter()
  const navStore = useNavigationStore()
  const playerStore = usePlayerStore()
  const PLAYBACK_VOLUME_STEP = 5
  let removeNativePlayerCommandListener: (() => void) | null = null

  async function handleBeforeUnload() {
    await playerStore.saveCurrentPosition()
  }

  function handleNativePlayerCommand(command: NativeMenuCommand) {
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
      case 'seekBackward':
        playerStore.seekBackward(15)
        break
      case 'seekForward':
        playerStore.seekForward(30)
        break
      case 'volumeUp':
        playerStore.setVolume(playerStore.volume + PLAYBACK_VOLUME_STEP)
        break
      case 'volumeDown':
        playerStore.setVolume(playerStore.volume - PLAYBACK_VOLUME_STEP)
        break
      case 'toggleShuffle':
        playerStore.toggleShuffle()
        break
      case 'toggleRepeat':
        playerStore.toggleRepeat()
        break
      case 'openSettings':
        navStore.setActiveItem('settings')
        void router.push('/settings')
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

    const hasNoModifiers = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
    const isCommandShortcut = event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey

    if (event.code === 'Space') {
      if (!hasNoModifiers || !playerStore.hasVideo) return
      event.preventDefault()
      playerStore.togglePlay()
      return
    }

    if (!isCommandShortcut) return

    switch (event.code) {
      case 'ArrowLeft':
        if (!playerStore.hasPrevious) return
        event.preventDefault()
        playerStore.previous()
        return
      case 'ArrowRight':
        if (!playerStore.hasNext) return
        event.preventDefault()
        playerStore.next()
        return
      case 'KeyJ':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.seekBackward(15)
        return
      case 'KeyL':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.seekForward(30)
        return
      case 'KeyM':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.toggleMute()
        return
      case 'ArrowUp':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.setVolume(playerStore.volume + PLAYBACK_VOLUME_STEP)
        return
      case 'ArrowDown':
        if (!playerStore.hasVideo) return
        event.preventDefault()
        playerStore.setVolume(playerStore.volume - PLAYBACK_VOLUME_STEP)
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
    // 加载持久化的用户播放队列与播放历史
    await playerStore.loadUserQueue()
    await playerStore.loadHistory()
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
