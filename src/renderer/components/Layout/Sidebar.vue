<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { useNavigationStore, type NavItem } from '@/stores/navigation'
  import { useAuthStore } from '@/stores/auth'
  import { useRuntimeConfigStore } from '@/stores/runtimeConfig'
  import { useDialogFocusTrap } from '@/composables/useDialogFocusTrap'
  import {
    Home,
    Search,
    Heart,
    ListMusic,
    Settings,
    ChevronLeft,
    LogIn,
    LogOut,
    History,
    Menu,
    X
  } from 'lucide-vue-next'
  import appLogoWordmarkRaw from '@/assets/branding/app-logo-wordmark.svg?raw'

  const navStore = useNavigationStore()
  const authStore = useAuthStore()
  const runtimeConfigStore = useRuntimeConfigStore()

  const showLoginEntry = computed(() => runtimeConfigStore.ui.auth.showLoginEntry)
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
    { id: 'home', label: '首页', icon: Home },
    { id: 'search', label: '搜索', icon: Search },
    { id: 'favorites', label: '我的收藏', icon: Heart },
    { id: 'playlists', label: '播放列表', icon: ListMusic },
    { id: 'history', label: '播放历史', icon: History },
    { id: 'settings', label: '设置', icon: Settings }
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

  watch(showLoginEntry, (visible) => {
    if (!visible) {
      showLogoutConfirm.value = false
    }
  })

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
      <div class="logo" v-if="!navStore.sidebarCollapsed" role="img" aria-label="BliPod">
        <span class="logo-wordmark logo-asset" aria-hidden="true" v-html="appLogoWordmarkRaw"></span>
      </div>
      <button
        v-else
        class="logo-mini-btn"
        type="button"
        aria-label="展开侧边栏"
        @click="navStore.toggleSidebar"
      >
        <Menu :size="28" class="logo-mini-icon" />
      </button>
      <button
        v-if="!navStore.sidebarCollapsed"
        class="collapse-btn"
        @click="navStore.toggleSidebar"
        aria-label="收起侧边栏"
      >
        <ChevronLeft :size="18" />
      </button>
      <button class="mobile-close-btn" @click="navStore.closeMobileMenu" aria-label="关闭菜单">
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

    <div class="sidebar-footer" v-if="showLoginEntry && !navStore.sidebarCollapsed && authStore.isLoggedIn">
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

    <div class="logout-confirm-overlay" v-if="showLoginEntry && showLogoutConfirm" @click.self="cancelLogout">
      <div
        ref="logoutDialogRef"
        class="logout-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-description"
        @keydown="handleLogoutDialogKeydown"
      >
        <p id="logout-confirm-title" class="confirm-text">确认退出登录</p>
        <p id="logout-confirm-description" class="confirm-description">
          退出后将停止同步当前账号的登录状态。
        </p>
        <div class="confirm-actions">
          <button ref="cancelLogoutButtonRef" class="confirm-btn cancel" @click="cancelLogout">
            取消
          </button>
          <button class="confirm-btn logout" @click="confirmLogout">退出登录</button>
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
    justify-content: center;
    min-width: 0;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }

  .logo-wordmark,
  .logo-mark {
    display: block;
  }

  .logo-asset {
    display: block;
    color: var(--text-primary);
    line-height: 0;
    flex-shrink: 0;
  }

  .logo-asset :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .logo-wordmark {
    width: 112px;
    height: 40px;
    max-width: 100%;
  }

  .logo-mini-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .logo-mini-btn:hover {
    background: var(--bg-card);
  }

  .logo-mini-icon {
    flex-shrink: 0;
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
    color: var(--text-on-accent);
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
    gap: 12px;
    width: min(280px, calc(100% - 32px));
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    margin: 16px;
  }

  .confirm-text {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
  }

  .confirm-description {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    line-height: 1.5;
    text-align: center;
  }

  .confirm-actions {
    display: flex;
    gap: 12px;
  }

  .confirm-btn {
    flex: 1;
    min-height: 40px;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: var(--text-sm);
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
    color: var(--text-on-error);
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
