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

  const typeClasses = computed(() => {
    switch (props.type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    }
  })

  const iconClasses = computed(() => {
    switch (props.type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
      default:
        return 'text-blue-400'
    }
  })

  function handleClose() {
    emit('close')
  }
</script>

<template>
  <div
    class="toast-base flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg min-w-[300px] max-w-[500px] animate-in slide-in-from-right-2 fade-in duration-200"
    :class="typeClasses"
  >
    <component :is="icon" :size="20" :class="iconClasses" />
    <span class="toast-message flex-1 font-medium">{{ message }}</span>
    <button class="p-1 rounded-md hover:bg-white/10 transition-colors" @click="handleClose">
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
  .toast-base {
    font-size: var(--text-sm);
  }

  .toast-message {
    font-size: inherit;
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
