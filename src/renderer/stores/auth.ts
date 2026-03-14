import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import QRCode from 'qrcode'
import { useToast } from '../composables/useToast'
import { getUserFriendlyErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { logger } from '../utils/logger'

export const useAuthStore = defineStore('auth', () => {
  const toast = useToast()
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
      logger.warn('Failed to check login status:', e)
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
      const friendlyError = getUserFriendlyErrorMessage(e, '启动登录失败')
      loginError.value = friendlyError
      toast.error(friendlyError)
      isLoggingIn.value = false
      logger.error('Failed to start login:', e)
    }
  }

  async function logout(): Promise<void> {
    try {
      await window.electronAPI.auth.logout()
      isLoggedIn.value = false
      userInfo.value = null
      toast.success(getSuccessMessage('logout'))
    } catch (e) {
      const friendlyError = getUserFriendlyErrorMessage(e, '退出登录失败')
      loginError.value = friendlyError
      toast.error(friendlyError)
      logger.error('Failed to logout:', e)
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
      logger.error('Failed to generate QR code:', e)
      const friendlyError = '生成二维码失败，请重试'
      loginError.value = friendlyError
      toast.error(friendlyError)
    }
  }

  function setLoginSuccess(user: UserInfo) {
    isLoggedIn.value = true
    userInfo.value = user
    isLoggingIn.value = false
    qrCodeUrl.value = null
    qrCodeDataUrl.value = null
    loginError.value = null
    toast.success(getSuccessMessage('login'))
  }

  function setLoginError(error: string) {
    const friendlyError = getUserFriendlyErrorMessage(error, '登录失败')
    loginError.value = friendlyError
    isLoggingIn.value = false
    toast.error(friendlyError)
    logger.error('Login error:', error)
  }

  async function cancelLogin() {
    try {
      await window.electronAPI.auth.cancelLogin()
    } catch (e) {
      logger.warn('Failed to cancel login:', e)
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
