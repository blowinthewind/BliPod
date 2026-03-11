<script setup lang="ts">
import { ref } from 'vue'
import { Search, X, Menu } from 'lucide-vue-next'
import { useNavigationStore } from '@/stores/navigation'

const navStore = useNavigationStore()
const searchQuery = ref('')
const isSearchFocused = ref(false)

function handleSearch() {
  if (searchQuery.value.trim()) {
    console.log('Searching for:', searchQuery.value)
  }
}

function clearSearch() {
  searchQuery.value = ''
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="mobile-menu-btn" @click="navStore.toggleMobileMenu">
        <Menu :size="22" />
      </button>
      <div class="window-controls">
        <div class="traffic-lights">
          <span class="traffic-light close"></span>
          <span class="traffic-light minimize"></span>
          <span class="traffic-light maximize"></span>
        </div>
      </div>
    </div>

    <div class="header-center">
      <div
        class="search-container"
        :class="{ focused: isSearchFocused }"
      >
        <Search :size="18" class="search-icon" />
        <input
          type="text"
          class="search-input"
          placeholder="Search Bilibili videos..."
          v-model="searchQuery"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
          @keyup.enter="handleSearch"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          @click="clearSearch"
        >
          <X :size="16" />
        </button>
      </div>
    </div>

    <div class="header-right">
      <div class="header-actions">
        <button class="action-btn">
          <span class="notification-dot"></span>
        </button>
      </div>
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

.header-left,
.header-right {
  display: flex;
  align-items: center;
  min-width: 120px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 24px;
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

.traffic-lights {
  display: flex;
  gap: 8px;
}

.traffic-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
}

.traffic-light.close {
  background: #ff5f57;
}

.traffic-light.minimize {
  background: #febc2e;
}

.traffic-light.maximize {
  background: #28c840;
}

.search-container {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 480px;
  height: 40px;
  padding: 0 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 20px;
  transition: all 0.2s ease;
}

.search-container.focused {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.15);
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0 10px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--accent);
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

@media (max-width: 768px) {
  .header-left {
    min-width: auto;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .window-controls {
    display: none;
  }

  .header-center {
    padding: 0 12px;
  }

  .header-right {
    min-width: auto;
  }
}
</style>
