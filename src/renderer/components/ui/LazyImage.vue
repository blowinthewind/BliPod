<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play, ImageOff } from 'lucide-vue-next'
import { optimizeImageSize } from '../../composables/useImageLazyload'

interface Props {
  src: string
  alt?: string
  aspectRatio?: string
  objectFit?: 'cover' | 'contain' | 'fill'
  width?: number
  showPlaceholder?: boolean
  placeholderIcon?: 'play' | 'image' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  aspectRatio: '16/9',
  objectFit: 'cover',
  width: 320,
  showPlaceholder: true,
  placeholderIcon: 'play',
})

const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
}>()

const isLoaded = ref(false)
const hasError = ref(false)

// 优化后的图片 URL
const optimizedSrc = computed(() => {
  return optimizeImageSize(props.src, props.width)
})

// 处理图片加载成功
function handleLoad(event: Event) {
  isLoaded.value = true
  hasError.value = false
  emit('load', event)
}

// 处理图片加载失败
function handleError(event: Event) {
  hasError.value = true
  isLoaded.value = false
  emit('error', event)
}

// 重新加载图片
function retryLoad() {
  hasError.value = false
  isLoaded.value = false
}
</script>

<template>
  <div
    class="lazy-image-container"
    :style="{ aspectRatio: aspectRatio }"
  >
    <!-- 加载中骨架屏 -->
    <div
      v-if="!isLoaded && !hasError"
      class="skeleton-loader"
      :style="{ aspectRatio: aspectRatio }"
    >
      <div class="skeleton-shimmer"></div>
    </div>

    <!-- 懒加载图片 -->
    <img
      v-if="!hasError"
      v-lazy="optimizedSrc"
      :alt="alt"
      class="lazy-image"
      :class="{ 'is-loaded': isLoaded }"
      :style="{ objectFit: objectFit }"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 错误状态 / 占位符 -->
    <div
      v-if="hasError || (!src && showPlaceholder)"
      class="cover-placeholder"
    >
      <Play v-if="placeholderIcon === 'play'" :size="24" />
      <ImageOff v-else-if="placeholderIcon === 'image'" :size="24" />
      <slot name="placeholder">
        <span v-if="hasError" class="error-text" @click="retryLoad">加载失败，点击重试</span>
      </slot>
    </div>

    <!-- 透传的内容（如时长标签） -->
    <slot />
  </div>
</template>

<style scoped>
.lazy-image-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: var(--bg-card);
}

.skeleton-loader {
  position: absolute;
  inset: 0;
  background: var(--bg-secondary);
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-card) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.lazy-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image.is-loaded {
  opacity: 1;
}

/* vue-lazyload 加载状态样式 */
.lazy-image[lazy="loading"] {
  opacity: 0;
}

.lazy-image[lazy="loaded"] {
  opacity: 1;
}

.lazy-image[lazy="error"] {
  opacity: 0;
}

.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  background: var(--bg-card);
}

.error-text {
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.error-text:hover {
  color: var(--accent);
  background: var(--bg-secondary);
}
</style>
