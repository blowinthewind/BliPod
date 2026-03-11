<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import PlayerBar from './PlayerBar.vue'
</script>

<template>
  <div class="main-layout">
    <Sidebar />
    <div class="layout-content">
      <Header />
      <main class="content-area">
        <slot />
      </main>
    </div>
    <PlayerBar />
  </div>
</template>

<style scoped>
.main-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.layout-content {
  display: flex;
  flex-direction: column;
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
}

.main-layout > :last-child {
  grid-column: 1 / -1;
  grid-row: 2;
}
</style>
