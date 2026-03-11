import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NavItem = 'home' | 'search' | 'favorites' | 'playlists' | 'settings'

export const useNavigationStore = defineStore('navigation', () => {
  const activeItem = ref<NavItem>('home')
  const sidebarCollapsed = ref(false)
  const mobileMenuOpen = ref(false)

  function setActiveItem(item: NavItem) {
    activeItem.value = item
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleMobileMenu() {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  function closeMobileMenu() {
    mobileMenuOpen.value = false
  }

  return {
    activeItem,
    sidebarCollapsed,
    mobileMenuOpen,
    setActiveItem,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu
  }
})
