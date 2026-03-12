import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const isLoggingIn = ref(false)
  const userInfo = ref<UserInfo | null>(null)
  const qrCodeUrl = ref<string | null>(null)
  const loginError = ref<string | null>(null)

  const userName = computed(() => userInfo.value?.name || 'Guest')
  const userAvatar = computed(() => userInfo.value?.face || '')

  async function checkLoginStatus(): Promise<void> {
    try {
      const status = await window.electronAPI.auth.checkLogin()
      isLoggedIn.value = status.isLoggedIn
      userInfo.value = status.userInfo
    } catch (e) {
      isLoggedIn.value = false
      userInfo.value = null
    }
  }

  async function startLogin(): Promise<void> {
    isLoggingIn.value = true
    loginError.value = null
    qrCodeUrl.value = null

    try {
      await window.electronAPI.auth.startLogin()
    } catch (e) {
      loginError.value = e instanceof Error ? e.message : 'Failed to start login'
      isLoggingIn.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await window.electronAPI.auth.logout()
      isLoggedIn.value = false
      userInfo.value = null
    } catch (e) {
      loginError.value = e instanceof Error ? e.message : 'Failed to logout'
    }
  }

  function setQrCode(url: string) {
    qrCodeUrl.value = url
  }

  function setLoginSuccess(user: UserInfo) {
    isLoggedIn.value = true
    userInfo.value = user
    isLoggingIn.value = false
    qrCodeUrl.value = null
    loginError.value = null
  }

  function setLoginError(error: string) {
    loginError.value = error
    isLoggingIn.value = false
  }

  function cancelLogin() {
    isLoggingIn.value = false
    qrCodeUrl.value = null
    loginError.value = null
  }

  function setLoginListener() {
    const unsubscribeQr = window.electronAPI.auth.onQrCode((url: string) => {
      setQrCode(url)
    })

    const unsubscribeSuccess = window.electronAPI.auth.onLoginSuccess((user: UserInfo) => {
      setLoginSuccess(user)
    })

    const unsubscribeError = window.electronAPI.auth.onLoginError((error: string) => {
      setLoginError(error)
    })

    return () => {
      unsubscribeQr()
      unsubscribeSuccess()
      unsubscribeError()
    }
  }

  return {
    isLoggedIn,
    isLoggingIn,
    userInfo,
    qrCodeUrl,
    loginError,
    userName,
    userAvatar,
    checkLoginStatus,
    startLogin,
    logout,
    cancelLogin,
    setLoginListener
  }
})
