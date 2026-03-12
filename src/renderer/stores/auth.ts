import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import QRCode from 'qrcode'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const isLoggingIn = ref(false)
  const userInfo = ref<UserInfo | null>(null)
  const qrCodeUrl = ref<string | null>(null)
  const qrCodeDataUrl = ref<string | null>(null)
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
    qrCodeDataUrl.value = null

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

  async function setQrCode(url: string) {
    qrCodeUrl.value = url
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      qrCodeDataUrl.value = dataUrl
    } catch (e) {
      console.error('Failed to generate QR code:', e)
      loginError.value = 'Failed to generate QR code image'
    }
  }

  function setLoginSuccess(user: UserInfo) {
    isLoggedIn.value = true
    userInfo.value = user
    isLoggingIn.value = false
    qrCodeUrl.value = null
    qrCodeDataUrl.value = null
    loginError.value = null
  }

  function setLoginError(error: string) {
    loginError.value = error
    isLoggingIn.value = false
  }

  async function cancelLogin() {
    try {
      await window.electronAPI.auth.cancelLogin()
    } catch (e) {
      console.error('Failed to cancel login:', e)
    }
    isLoggingIn.value = false
    qrCodeUrl.value = null
    qrCodeDataUrl.value = null
    loginError.value = null
  }

  function setLoginListener() {
    const unsubscribeQr = window.electronAPI.auth.onQrCode(async (url: string) => {
      await setQrCode(url)
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
    qrCodeDataUrl,
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
