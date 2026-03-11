<script setup lang="ts">
import { useNavigationStore, type NavItem } from '@/stores/navigation'
import {
  Home,
  Search,
  Heart,
  ListMusic,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-vue-next'

const navStore = useNavigationStore()

interface NavMenuItem {
  id: NavItem
  label: string
  icon: typeof Home
}

const menuItems: NavMenuItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'settings', label: 'Settings', icon: Settings }
]
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 
      collapsed: navStore.sidebarCollapsed,
      'mobile-open': navStore.mobileMenuOpen 
    }"
  >
    <div class="sidebar-header">
      <div class="logo" v-if="!navStore.sidebarCollapsed">
        <span class="logo-icon">🎵</span>
        <span class="logo-text">BliPod</span>
      </div>
      <div class="logo-mini" v-else>
        <span>🎵</span>
      </div>
      <button class="collapse-btn" @click="navStore.toggleSidebar">
        <ChevronLeft v-if="!navStore.sidebarCollapsed" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <button class="mobile-close-btn" @click="navStore.closeMobileMenu">
        <Menu :size="20" />
      </button>
    </div>

    <nav class="nav-menu">
      <router-link
        v-for="item in menuItems"
        :key="item.id"
        :to="{ name: item.id }"
        class="nav-item"
        :class="{ active: navStore.activeItem === item.id }"
        @click="navStore.setActiveItem(item.id); navStore.closeMobileMenu()"
      >
        <component :is="item.icon" :size="22" class="nav-icon" />
        <span class="nav-label" v-if="!navStore.sidebarCollapsed">
          {{ item.label }}
        </span>
      </router-link>
    </nav>

    <div class="sidebar-footer" v-if="!navStore.sidebarCollapsed">
      <div class="user-info">
        <div class="user-avatar">
          <img src="" alt="" class="avatar-img" />
          <div class="avatar-placeholder">U</div>
        </div>
        <div class="user-details">
          <span class="user-name">Not logged in</span>
          <span class="user-status">Click to login</span>
        </div>
      </div>
    </div>
  </aside>
  <div 
    class="sidebar-overlay" 
    v-if="navStore.mobileMenuOpen" 
    @click="navStore.closeMobileMenu"
  ></div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  transition: width 0.3s ease, transform 0.3s ease;
  overflow: hidden;
  z-index: 100;
}

.sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 64px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.logo-mini {
  font-size: 24px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.mobile-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent);
  color: white;
}

.nav-item.active .nav-icon {
  color: white;
}

.nav-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.nav-item:hover .nav-icon {
  color: var(--text-primary);
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  transition: background 0.2s;
}

.user-info:hover {
  background: var(--bg-primary);
}

.user-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    width: 280px;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .sidebar.collapsed {
    width: 280px;
  }

  .collapse-btn {
    display: none;
  }

  .mobile-close-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
  }
}
</style>
