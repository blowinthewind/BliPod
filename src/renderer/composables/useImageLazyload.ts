import type { VueLazyloadOptions } from 'vue-lazyload'

/**
 * 图片懒加载配置选项
 */
export const lazyloadOptions: VueLazyloadOptions = {
  // 预加载高度：提前加载可视区域下方 300px 的图片
  preLoad: 1.3,

  // 错误占位图（加载失败时显示）
  error: '',

  // 加载中占位图（可以是一个 base64 图片或空）
  loading: '',

  // 尝试加载次数
  attempt: 3,

  // 启用 Intersection Observer
  observer: true,

  // Intersection Observer 配置
  observerOptions: {
    rootMargin: '0px',
    threshold: 0.1,
  },

  // 图片加载完成后的淡入效果
  adapter: {
    loaded({ el }: { el: HTMLElement }) {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0'
        el.style.transition = 'opacity 0.3s ease'
        requestAnimationFrame(() => {
          el.style.opacity = '1'
        })
      }
    },
  },
}

/**
 * 生成骨架屏样式的占位背景
 */
export function getSkeletonBackground(): string {
  return 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-secondary) 50%, var(--bg-card) 75%)'
}

/**
 * 图片加载错误处理
 */
export function handleImageError(el: HTMLElement): void {
  el.style.display = 'none'
  // 触发父元素的占位符显示
  const parent = el.parentElement
  if (parent) {
    const placeholder = parent.querySelector('.cover-placeholder')
    if (placeholder) {
      ;(placeholder as HTMLElement).style.display = 'flex'
    }
  }
}

/**
 * 图片尺寸优化：根据容器宽度选择合适的 B站封面尺寸
 * @param url 原始封面 URL
 * @param width 容器宽度
 * @returns 优化后的 URL
 */
export function optimizeImageSize(url: string, width: number = 320): string {
  if (!url || !url.includes('hdslb.com')) {
    return url
  }

  // B站封面尺寸参数：@320w, @480w, @640w
  let size = '@320w'
  if (width >= 640) {
    size = '@640w'
  } else if (width >= 480) {
    size = '@480w'
  }

  // 移除已有的尺寸参数（匹配 @ 开头的所有参数，如 @672w_378h_1c_!web-search-common-cover）
  const cleanUrl = url.replace(/@[^?]+/, '')

  // 处理 URL 中的查询参数，将尺寸参数插入到查询参数之前
  const queryIndex = cleanUrl.indexOf('?')
  if (queryIndex !== -1) {
    const baseUrl = cleanUrl.slice(0, queryIndex)
    const query = cleanUrl.slice(queryIndex)
    return baseUrl + size + query
  }

  return cleanUrl + size
}
