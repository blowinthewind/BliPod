<script setup lang="ts">
  defineOptions({
    inheritAttrs: false
  })

  const emit = defineEmits<{
    close: []
  }>()

  function handleOverlayClick() {
    emit('close')
  }
</script>

<template>
  <div v-bind="$attrs" @click.self="handleOverlayClick">
    <slot />
  </div>
</template>
