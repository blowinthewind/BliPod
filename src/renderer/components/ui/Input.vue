<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import { Loader2 } from 'lucide-vue-next'
  import { ref, useAttrs } from 'vue'

  defineOptions({
    inheritAttrs: false
  })

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

  const attrs = useAttrs()
  const inputRef = ref<HTMLInputElement | null>(null)

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
  }

  defineExpose({
    focus: () => inputRef.value?.focus(),
    blur: () => inputRef.value?.blur(),
    input: inputRef
  })
</script>

<template>
  <div class="input-wrapper" :class="{ 'has-icon': props.loading }">
    <input
      ref="inputRef"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled || props.loading"
      :aria-invalid="props.error"
      :aria-busy="props.loading ? 'true' : undefined"
      :class="
        cn('input-base', props.error && 'input-error', props.loading && 'input-loading-padding')
      "
      v-bind="attrs"
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
    width: 100%;
  }

  .input-base {
    width: 100%;
    font-size: var(--text-sm);
    font-family: inherit;
    color: inherit;
    background: transparent;
    outline: none;
  }

  .input-base:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .input-base::placeholder {
    color: var(--text-tertiary);
  }

  .input-loading-padding {
    padding-right: 40px;
  }

  .input-error {
    border-color: var(--error);
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
