<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  type?: 'text' | 'password' | 'email' | 'number'
  placeholder?: string
  disabled?: boolean
  modelValue?: string | number
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
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
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="cn(
      'flex h-10 w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary',
      'placeholder:text-text-secondary',
      'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors'
    )"
    @input="onInput"
  >
</template>
