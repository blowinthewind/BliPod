<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false
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
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  }
  return sizes[props.size]
})
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variantClasses,
      sizeClasses
    )"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
