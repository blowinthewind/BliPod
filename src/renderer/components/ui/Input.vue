<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import { Loader2 } from 'lucide-vue-next'

  interface Props {
    type?: 'text' | 'password' | 'email' | 'number'
    placeholder?: string
    disabled?: boolean
    error?: boolean
    loading?: boolean
    modelValue?: string | number
  }

  const props = withDefaults(defineProps<Props>(), {
    type: 'text',
    placeholder: '',
    disabled: false,
    error: false,
    loading: false,
    modelValue: ''
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
  }
</script>

<template>
  <div class="input-wrapper" :class="{ 'has-icon': props.loading }">
    <input
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled || props.loading"
      :aria-invalid="props.error"
      :aria-busy="props.loading ? 'true' : undefined"
      :class="
        cn(
          'input-base flex h-10 w-full rounded-lg border bg-bg-primary px-3 py-2 text-text-primary',
          'border-border',
          'placeholder:text-text-tertiary',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          props.error && 'border-error focus:ring-error',
          props.loading && 'pr-10'
        )
      "
      @input="onInput"
    />
    <span v-if="props.loading" class="input-loading-icon" aria-hidden="true">
      <Loader2 :size="16" class="animate-spin" />
    </span>
  </div>
</template>

<style scoped>
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-base {
    font-size: var(--text-sm);
  }

  .input-loading-icon {
    position: absolute;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    pointer-events: none;
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
