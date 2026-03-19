<script setup lang="ts">
  import { computed } from 'vue'
  import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
  import type { ToastType } from '../../composables/useToast'

  interface Props {
    message: string
    type: ToastType
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    close: []
  }>()

  const icon = computed(() => {
    switch (props.type) {
      case 'success':
        return CheckCircle
      case 'error':
        return XCircle
      case 'warning':
        return AlertTriangle
      case 'info':
      default:
        return Info
    }
  })

  const typeClass = computed(() => {
    switch (props.type) {
      case 'success':
        return 'toast--success'
      case 'error':
        return 'toast--error'
      case 'warning':
        return 'toast--warning'
      case 'info':
      default:
        return 'toast--info'
    }
  })

  const iconClass = computed(() => {
    switch (props.type) {
      case 'success':
        return 'toast-icon--success'
      case 'error':
        return 'toast-icon--error'
      case 'warning':
        return 'toast-icon--warning'
      case 'info':
      default:
        return 'toast-icon--info'
    }
  })

  function handleClose() {
    emit('close')
  }
</script>

<template>
  <div class="toast-base animate-in" :class="typeClass">
    <component :is="icon" :size="20" :class="iconClass" />
    <span class="toast-message">{{ message }}</span>
    <button class="toast-close" type="button" aria-label="关闭提示" @click="handleClose">
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
  .toast-base {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 500px;
    padding: 12px 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
    color: var(--text-primary);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
  }

  .toast-message {
    font-size: inherit;
    font-weight: 500;
    line-height: 1.4;
    flex: 1;
  }

  .toast-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s;
  }

  .toast-close:hover {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  .toast--success {
    border-color: color-mix(in srgb, var(--success) 36%, var(--border));
    background: color-mix(in srgb, var(--success) 14%, var(--bg-elevated));
  }

  .toast--error {
    border-color: color-mix(in srgb, var(--error) 36%, var(--border));
    background: color-mix(in srgb, var(--error) 14%, var(--bg-elevated));
  }

  .toast--warning {
    border-color: color-mix(in srgb, var(--warning) 36%, var(--border));
    background: color-mix(in srgb, var(--warning) 14%, var(--bg-elevated));
  }

  .toast--info {
    border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
    background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated));
  }

  .toast-icon--success {
    color: var(--success);
  }

  .toast-icon--error {
    color: var(--error);
  }

  .toast-icon--warning {
    color: var(--warning);
  }

  .toast-icon--info {
    color: var(--accent);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-in {
    animation: slideIn 0.2s ease-out;
  }
</style>
