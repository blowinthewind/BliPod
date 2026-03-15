<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNavigationStore, type NavItem } from '@/stores/navigation'
import { useAuthStore } from '@/stores/auth'
import {
  Home,
  Search,
  Heart,
  ListMusic,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogIn,
  LogOut
} from 'lucide-vue-next'

const router = useRouter()
const navStore = useNavigationStore()
const authStore = useAuthStore()

const showLogoutConfirm = ref(false)

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

let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = authStore.setLoginListener()
  authStore.checkLoginStatus()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

function confirmLogout() {
  authStore.logout()
  showLogoutConfirm.value = false
}

function cancelLogout() {
  showLogoutConfirm.value = false
}
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

    <div class="sidebar-footer" v-if="!navStore.sidebarCollapsed && authStore.isLoggedIn">
      <div class="user-info">
        <div class="user-avatar">
          <img
            v-if="authStore.userInfo?.face"
            :src="authStore.userInfo.face"
            :alt="authStore.userInfo.name"
            class="avatar-img"
          />
          <div v-else class="avatar-placeholder">
            <LogIn :size="18" />
          </div>
        </div>
        <div class="user-details">
          <div class="user-name-row">
            <span class="user-name">
              {{ authStore.userInfo?.name }}
            </span>
            <LogOut
              :size="16"
              class="logout-icon"
              @click.stop="showLogoutConfirm = true"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="logout-confirm-overlay" v-if="showLogoutConfirm" @click.self="cancelLogout">
      <div class="logout-confirm-dialog">
        <p class="confirm-text">Confirm logout?</p>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="cancelLogout">Cancel</button>
          <button class="confirm-btn logout" @click="confirmLogout">Logout</button>
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
  flex-shrink: 0;
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
}

.user-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  justify-content: center;
}

.user-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.user-info:hover .logout-icon {
  color: var(--error);
}

.user-status {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.logout-confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin: 16px;
}

.confirm-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background: var(--bg-card);
  color: var(--text-primary);
}

.confirm-btn.cancel:hover {
  background: var(--bg-primary);
}

.confirm-btn.logout {
  background: var(--error);
  color: white;
}

.confirm-btn.logout:hover {
  opacity: 0.9;
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
