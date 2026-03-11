import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NavItem = 'home' | 'search' | 'favorites' | 'playlists' | 'settings'

export const useNavigationStore = defineStore('navigation', () => {
  const activeItem = ref<NavItem>('home')
  const sidebarCollapsed = ref(false)

  function setActiveItem(item: NavItem) {
    activeItem.value = item
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    activeItem,
    sidebarCollapsed,
    setActiveItem,
    toggleSidebar
  }
})
