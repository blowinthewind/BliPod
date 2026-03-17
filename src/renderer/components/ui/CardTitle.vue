<script setup lang="ts">
  import { cn } from '@/lib/utils'

  interface Props {
    class?: string
  }

  const props = defineProps<Props>()
</script>

<template>
  <h3
    :class="
      cn('card-title font-semibold leading-none tracking-tight text-text-primary', props.class)
    "
  >
    <slot />
  </h3>
</template>

<style scoped>
  .card-title {
    font-size: var(--text-lg);
  }
</style>
