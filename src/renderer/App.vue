<script setup lang="ts">
import MainLayout from '@/components/Layout/MainLayout.vue'
</script>

<template>
  <MainLayout>
    <router-view />
  </MainLayout>
</template>

<style>
:root {
  --bg-primary: #0d0d0d;
  --bg-secondary: #141414;
  --bg-card: #1a1a1a;
  --bg-elevated: #242424;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent: #e94560;
  --accent-hover: #ff6b6b;
  --border: #2d2d2d;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--bg-card);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bg-elevated);
}

::selection {
  background: var(--accent);
  color: white;
}
</style>
