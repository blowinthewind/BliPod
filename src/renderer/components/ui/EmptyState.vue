<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import type { Component } from 'vue'

  interface Props {
    icon?: Component
    title: string
    description?: string
    action?: string
    class?: string
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    action: []
  }>()
</script>

<template>
  <div :class="cn('empty-state', props.class)" role="status">
    <div class="empty-state-icon" v-if="props.icon">
      <component :is="props.icon" :size="48" />
    </div>
    <div class="empty-state-icon default-icon" v-else>
      <span>📭</span>
    </div>
    <h3 class="empty-state-title">{{ props.title }}</h3>
    <p class="empty-state-description" v-if="props.description">
      {{ props.description }}
    </p>
    <button
      v-if="props.action"
      class="btn btn-primary empty-state-action"
      @click="emit('action')"
    >
      {{ props.action }}
    </button>
  </div>
</template>

<style scoped>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16) var(--space-8);
    text-align: center;
  }

  .empty-state-icon {
    color: var(--text-tertiary);
    opacity: 0.5;
    margin-bottom: var(--space-4);
  }

  .empty-state-icon.default-icon {
    font-size: 48px;
  }

  .empty-state-title {
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .empty-state-description {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 280px;
  }

  .empty-state-action {
    margin-top: var(--space-6);
  }
</style>
