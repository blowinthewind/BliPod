<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { cn } from '@/lib/utils'

  defineOptions({
    inheritAttrs: false
  })

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

  const attrs = useAttrs()

  const variantClasses = computed(() => {
    return `button--${props.variant}`
  })

  const sizeClasses = computed(() => {
    return `button--${props.size}`
  })

  const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :class="cn('button-base', variantClasses, sizeClasses)"
    v-bind="attrs"
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
  .button-base {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: 10px;
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      border-color 0.2s,
      opacity 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .button-base:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .button-base:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .button--default {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg-primary);
  }

  .button--default:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }

  .button--destructive {
    background: color-mix(in srgb, var(--error) 18%, var(--bg-card));
    border-color: color-mix(in srgb, var(--error) 28%, var(--border));
    color: var(--error);
  }

  .button--destructive:hover:not(:disabled) {
    background: color-mix(in srgb, var(--error) 24%, var(--bg-card));
    border-color: color-mix(in srgb, var(--error) 42%, var(--border));
  }

  .button--outline {
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .button--outline:hover:not(:disabled) {
    background: var(--bg-card);
    border-color: var(--text-secondary);
  }

  .button--secondary {
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--border);
  }

  .button--secondary:hover:not(:disabled) {
    background: var(--bg-elevated);
    border-color: var(--text-secondary);
  }

  .button--ghost {
    background: transparent;
    color: var(--text-secondary);
  }

  .button--ghost:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--text-primary);
  }

  .button--link {
    background: transparent;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 4px;
    padding: 0;
    border-radius: 0;
  }

  .button--link:hover:not(:disabled) {
    color: var(--accent-hover);
  }

  .button--default,
  .button--lg,
  .button--icon {
    font-size: var(--text-sm);
  }

  .button--sm {
    font-size: var(--text-xs);
  }

  .button--default {
    min-height: 40px;
    padding: 10px 16px;
  }

  .button--sm {
    min-height: 36px;
    padding: 8px 12px;
  }

  .button--lg {
    min-height: 44px;
    padding: 10px 20px;
  }

  .button--icon {
    width: 40px;
    height: 40px;
    padding: 0;
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
