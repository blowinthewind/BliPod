<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useNavigationStore, type NavItem } from '@/stores/navigation'
  import { useAuthStore } from '@/stores/auth'
  import { useDialogFocusTrap } from '@/composables/useDialogFocusTrap'
  import {
    Home,
    Search,
    Heart,
    ListMusic,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogIn,
    LogOut,
    History,
    X,
    Music
  } from 'lucide-vue-next'

  const navStore = useNavigationStore()
  const authStore = useAuthStore()

  const showLogoutConfirm = ref(false)
  const logoutButtonRef = ref<HTMLButtonElement | null>(null)
  const logoutDialogRef = ref<HTMLDivElement | null>(null)
  const cancelLogoutButtonRef = ref<HTMLButtonElement | null>(null)

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
    { id: 'history', label: 'History', icon: History },
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

  function handleNavClick(itemId: NavItem) {
    navStore.setActiveItem(itemId)
    navStore.closeMobileMenu()
  }

  const { handleKeydown: handleLogoutDialogKeydown } = useDialogFocusTrap({
    open: showLogoutConfirm,
    containerRef: logoutDialogRef,
    initialFocusRef: cancelLogoutButtonRef,
    restoreFocusRef: logoutButtonRef,
    onClose: cancelLogout
  })
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
        <div class="logo-icon">
          <Music :size="20" />
        </div>
        <span class="logo-text">BliPod</span>
      </div>
      <div class="logo-mini" v-else>
        <div class="logo-icon-mini">
          <Music :size="20" />
        </div>
      </div>
      <button
        class="collapse-btn"
        @click="navStore.toggleSidebar"
        :aria-label="navStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <ChevronLeft v-if="!navStore.sidebarCollapsed" :size="18" />
        <ChevronRight v-else :size="18" />
      </button>
      <button class="mobile-close-btn" @click="navStore.closeMobileMenu" aria-label="Close menu">
        <X :size="20" />
      </button>
    </div>

    <nav class="nav-menu">
      <router-link
        v-for="item in menuItems"
        :key="item.id"
        :to="{ name: item.id }"
        class="nav-item"
        :class="{ active: navStore.activeItem === item.id }"
        @click="handleNavClick(item.id)"
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
            <button
              ref="logoutButtonRef"
              class="logout-btn"
              type="button"
              aria-label="退出登录"
              @click.stop="showLogoutConfirm = true"
            >
              <LogOut :size="16" class="logout-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="logout-confirm-overlay" v-if="showLogoutConfirm" @click.self="cancelLogout">
      <div
        ref="logoutDialogRef"
        class="logout-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        @keydown="handleLogoutDialogKeydown"
      >
        <p id="logout-confirm-title" class="confirm-text">Confirm logout?</p>
        <div class="confirm-actions">
          <button ref="cancelLogoutButtonRef" class="confirm-btn cancel" @click="cancelLogout">
            Cancel
          </button>
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
    width: clamp(220px, 18vw, 240px);
    height: 100%;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    transition:
      width 0.3s ease,
      transform 0.3s ease;
    overflow: hidden;
    z-index: 100;
  }

  .sidebar.collapsed {
    width: 80px;
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
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    border-radius: var(--radius-md);
    color: white;
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
  }

  .logo-mini {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-icon-mini {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    border-radius: var(--radius-md);
    color: white;
  }

  .collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s;
  }

  .collapse-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .mobile-close-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
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
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
    cursor: pointer;
  }

  .nav-item:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .nav-item.active .nav-icon {
    color: var(--accent);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-xs);
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

  .logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
  }

  .user-info:hover .logout-icon {
    color: var(--error);
  }

  .user-status {
    font-size: var(--text-xs);
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
    background: var(--bg-overlay);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-xs);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      opacity 0.2s;
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
    background: var(--bg-overlay);
    z-index: 99;
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      transform: translateX(-100%);
      width: min(280px, calc(100vw - 24px));
    }

    .sidebar.mobile-open {
      transform: translateX(0);
    }

    .sidebar.collapsed {
      width: min(280px, calc(100vw - 24px));
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
