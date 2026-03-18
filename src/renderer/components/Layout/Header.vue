<script setup lang="ts">
  import { Menu } from 'lucide-vue-next'
  import { useNavigationStore } from '@/stores/navigation'

  const navStore = useNavigationStore()
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button
        class="mobile-menu-btn"
        type="button"
        aria-label="打开导航菜单"
        @click="navStore.toggleMobileMenu"
      >
        <Menu :size="22" />
      </button>
    </div>
  </header>
</template>

<style scoped>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .header-left {
    display: flex;
    align-items: center;
    min-width: 120px;
  }

  .mobile-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    margin-right: 8px;
  }

  .mobile-menu-btn:hover {
    background: var(--bg-card);
  }

  @media (max-width: 768px) {
    .header-left {
      min-width: auto;
    }

    .mobile-menu-btn {
      display: flex;
    }
  }
</style>
