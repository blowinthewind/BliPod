<script setup lang="ts">
  import { computed } from 'vue'
  import { cn } from '@/lib/utils'

  interface Props {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    disabled?: boolean
    loading?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    size: 'default',
    disabled: false,
    loading: false
  })

  const variantClasses = computed(() => {
    const variants: Record<string, string> = {
      default: 'bg-accent text-white hover:bg-accent-hover',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-border bg-transparent hover:bg-bg-card',
      secondary: 'bg-bg-card text-text-primary hover:bg-bg-secondary',
      ghost: 'hover:bg-bg-card',
      link: 'text-accent underline-offset-4 hover:underline'
    }
    return variants[props.variant]
  })

  const sizeClasses = computed(() => {
    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2 btn-size-default',
      sm: 'h-9 rounded-md px-3 btn-size-sm',
      lg: 'h-11 rounded-md px-8 btn-size-lg',
      icon: 'h-10 w-10 btn-size-icon'
    }
    return sizes[props.size]
  })

  const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :class="
      cn(
        'btn-base relative inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses,
        sizeClasses
      )
    "
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <span :class="cn('inline-flex items-center gap-2', loading && 'opacity-0')">
      <slot />
    </span>
    <span
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <span class="btn-spinner" />
    </span>
  </button>
</template>

<style scoped>
  .btn-base {
    font-size: var(--text-sm);
  }

  .btn-size-default,
  .btn-size-lg,
  .btn-size-icon {
    font-size: var(--text-sm);
  }

  .btn-size-sm {
    font-size: var(--text-xs);
  }

  .btn-spinner {
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    animation: btn-spin 0.8s linear infinite;
  }

  @keyframes btn-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
