<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { ChevronUp, ChevronDown } from 'lucide-vue-next'

  interface Props {
    scrollContainer: string | HTMLElement
    threshold?: number
    showAtBottom?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    threshold: 10,
    showAtBottom: true
  })

  const showButtons = ref(false)
  const isAtTop = ref(true)
  const isAtBottom = ref(false)

  let container: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null

  function getScrollContainer(): HTMLElement | null {
    if (typeof props.scrollContainer === 'string') {
      return document.querySelector(props.scrollContainer) as HTMLElement
    }
    return props.scrollContainer
  }

  function checkScrollPosition() {
    if (!container) return

    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    isAtTop.value = scrollTop <= 10
    isAtBottom.value = scrollTop + clientHeight >= scrollHeight - 10

    // 当内容超过容器高度且滚动位置不在顶部时显示按钮
    const hasOverflow = scrollHeight > clientHeight + props.threshold
    showButtons.value = hasOverflow && !isAtTop.value
  }

  function scrollToTop() {
    if (!container) return
    container.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToBottom() {
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }

  onMounted(() => {
    container = getScrollContainer()
    if (!container) {
      console.warn('ScrollToButtons: scroll container not found')
      return
    }

    checkScrollPosition()
    container.addEventListener('scroll', checkScrollPosition, { passive: true })

    // 监听容器大小变化
    resizeObserver = new ResizeObserver(() => {
      checkScrollPosition()
    })
    resizeObserver.observe(container)
  })

  onUnmounted(() => {
    if (container) {
      container.removeEventListener('scroll', checkScrollPosition)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })
</script>

<template>
  <transition name="fade">
    <div v-if="showButtons" class="scroll-buttons">
      <button class="scroll-btn scroll-to-top" @click="scrollToTop" title="回到顶部">
        <ChevronUp :size="20" />
      </button>
      <button
        v-if="showAtBottom && !isAtBottom"
        class="scroll-btn scroll-to-bottom"
        @click="scrollToBottom"
        title="回到底部"
      >
        <ChevronDown :size="20" />
      </button>
    </div>
  </transition>
</template>

<style scoped>
  .scroll-buttons {
    position: fixed;
    right: 24px;
    bottom: 100px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 50;
  }

  .scroll-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
    font-size: var(--text-sm);
  }

  .scroll-btn:hover {
    background: var(--accent);
    color: var(--text-on-accent);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(233, 69, 96, 0.3);
  }

  .scroll-btn:active {
    transform: translateY(0);
  }

  .fade-enter-active,
  .fade-leave-active {
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }

  @media (max-width: 768px) {
    .scroll-buttons {
      right: 16px;
      bottom: 80px;
    }

    .scroll-btn {
      width: 40px;
      height: 40px;
    }
  }
</style>
