import { ref, computed } from 'vue'
import type { Ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
  createdAt: number
}

interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

// 全局 toast 列表
const toasts: Ref<Toast[]> = ref([])

// 生成唯一 ID
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 添加 toast
function addToast(options: ToastOptions): Toast {
  const toast: Toast = {
    id: generateId(),
    message: options.message,
    type: options.type || 'info',
    duration: options.duration || 3000,
    createdAt: Date.now()
  }

  toasts.value.push(toast)

  // 自动移除
  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  return toast
}

// 移除 toast
function removeToast(id: string): void {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 清空所有 toast
function clearAllToasts(): void {
  toasts.value = []
}

// 获取所有 toast
function getToasts(): Ref<Toast[]> {
  return toasts
}

// 组合式函数
export function useToast() {
  return {
    // 显示成功提示
    success(message: string, duration?: number) {
      return addToast({ message, type: 'success', duration })
    },

    // 显示错误提示
    error(message: string, duration?: number) {
      return addToast({ message, type: 'error', duration: duration || 5000 })
    },

    // 显示警告提示
    warning(message: string, duration?: number) {
      return addToast({ message, type: 'warning', duration })
    },

    // 显示信息提示
    info(message: string, duration?: number) {
      return addToast({ message, type: 'info', duration })
    },

    // 手动移除
    remove: removeToast,

    // 清空所有
    clear: clearAllToasts,

    // 获取列表（用于组件渲染）
    toasts: computed(() => toasts.value)
  }
}

// 导出工具函数供组件使用
export { addToast, removeToast, clearAllToasts, getToasts }
