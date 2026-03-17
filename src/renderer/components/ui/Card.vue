<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import { Loader2 } from 'lucide-vue-next'

  interface Props {
    class?: string
    loading?: boolean
    error?: boolean
    empty?: boolean
    emptyText?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    loading: false,
    error: false,
    empty: false,
    emptyText: 'No data'
  })
</script>

<template>
  <div
    :class="
      cn(
        'rounded-lg border border-border bg-bg-secondary p-4 transition-colors',
        'relative',
        props.loading && 'opacity-70',
        props.error && 'border-error',
        props.class
      )
    "
    :aria-busy="props.loading ? 'true' : undefined"
  >
    <div v-if="props.loading" class="card-loading-overlay">
      <Loader2 :size="24" class="animate-spin text-text-tertiary" />
    </div>
    <div v-else-if="props.empty" class="card-empty-state">
      <span class="text-text-tertiary text-sm">{{ props.emptyText }}</span>
    </div>
    <div v-else-if="props.error" class="card-error-state">
      <span class="text-error text-sm">Failed to load content</span>
    </div>
    <slot v-else />
  </div>
</template>

<style scoped>
  .card-loading-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .card-empty-state,
  .card-error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
