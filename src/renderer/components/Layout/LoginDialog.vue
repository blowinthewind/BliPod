<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useAuthStore } from '@/stores/auth'
  import { X, QrCode, Loader2, CheckCircle, AlertCircle } from 'lucide-vue-next'
  import { useDialogFocusTrap } from '@/composables/useDialogFocusTrap'

  const authStore = useAuthStore()

  const props = defineProps<{
    visible: boolean
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  let unsubscribe: (() => void) | null = null
  const loginDialogRef = ref<HTMLDivElement | null>(null)
  const closeButtonRef = ref<HTMLButtonElement | null>(null)

  onMounted(() => {
    unsubscribe = authStore.setLoginListener()
    authStore.checkLoginStatus()
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  function handleClose() {
    authStore.cancelLogin()
    emit('close')
  }

  function handleLogin() {
    authStore.startLogin()
  }

  function handleLogout() {
    authStore.logout()
  }

  const isOpen = computed(() => props.visible)

  const { handleKeydown: handleDialogKeydown } = useDialogFocusTrap({
    open: isOpen,
    containerRef: loginDialogRef,
    initialFocusRef: closeButtonRef,
    onClose: handleClose
  })
</script>

<template>
  <div class="login-dialog-overlay" v-if="visible" @click.self="handleClose">
    <div
      ref="loginDialogRef"
      class="login-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
      @keydown="handleDialogKeydown"
    >
      <button
        ref="closeButtonRef"
        class="close-btn"
        type="button"
        aria-label="关闭登录弹窗"
        @click="handleClose"
      >
        <X :size="20" />
      </button>

      <div class="dialog-header">
        <h2 id="login-dialog-title" class="dialog-title">登录哔哩哔哩</h2>
        <p class="dialog-desc">扫码后即可同步收藏、历史和个性化推荐</p>
      </div>

      <div class="dialog-content">
        <div v-if="authStore.isLoggedIn && authStore.userInfo" class="user-logged-in">
          <div class="user-info">
            <img
              :src="authStore.userInfo.face"
              :alt="authStore.userInfo.name"
              class="user-avatar"
            />
            <div class="user-details">
              <span class="user-name">{{ authStore.userInfo.name }}</span>
              <span class="user-level">Lv.{{ authStore.userInfo.level }}</span>
            </div>
          </div>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>

        <div v-else-if="authStore.isLoggingIn" class="login-progress">
          <div v-if="authStore.qrCodeDataUrl" class="qr-container">
            <img :src="authStore.qrCodeDataUrl" alt="QR Code" class="qr-code" />
            <div class="qr-hint">
              <QrCode :size="16" />
              <span>打开哔哩哔哩 App 扫码确认</span>
            </div>
          </div>
          <div v-else class="loading-state">
            <Loader2 :size="48" class="spin" />
            <span>正在生成登录二维码...</span>
          </div>

          <div v-if="authStore.loginError" class="error-message">
            <AlertCircle :size="16" />
            <span>{{ authStore.loginError }}</span>
          </div>
        </div>

        <div v-else class="login-prompt">
          <div class="qr-placeholder">
            <QrCode :size="64" />
          </div>
          <p class="prompt-text">登录后可同步你的收藏、历史记录和个性化推荐</p>
          <button class="login-btn" @click="handleLogin">
            <QrCode :size="18" />
            扫码登录
          </button>
        </div>
      </div>

      <div class="dialog-footer">
        <p class="security-note">
          <CheckCircle :size="14" />
          通过哔哩哔哩官方登录流程安全授权
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .login-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-overlay);
    z-index: 1000;
    padding: 20px;
  }

  .login-dialog {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: min(360px, 100%);
    padding: clamp(20px, 4vw, 24px);
    background: var(--bg-secondary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      opacity 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .dialog-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .dialog-title {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .dialog-desc {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .dialog-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 280px;
  }

  .user-logged-in {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--bg-card);
    border-radius: 12px;
    width: 100%;
  }

  .user-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .user-name {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .user-level {
    font-size: var(--text-xs);
    color: var(--accent);
    font-weight: 500;
  }

  .logout-btn {
    padding: 10px 24px;
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: var(--text-sm);
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s,
      transform 0.2s;
  }

  .logout-btn:hover {
    background: var(--bg-primary);
    border-color: var(--accent);
  }

  .login-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .qr-code {
    width: min(200px, 100%);
    aspect-ratio: 1;
    border-radius: 12px;
    background: white;
    padding: 12px;
  }

  .qr-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--text-secondary);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 8px;
    color: var(--error);
    font-size: var(--text-xs);
  }

  .login-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
  }

  @media (max-width: 480px) {
    .login-dialog-overlay {
      padding: 12px;
    }

    .dialog-content {
      min-height: 240px;
    }

    .user-info {
      gap: 12px;
      padding: 14px;
    }

    .qr-placeholder {
      width: 104px;
      height: 104px;
    }

    .login-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .qr-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    background: var(--bg-card);
    border-radius: 12px;
    color: var(--text-secondary);
  }

  .prompt-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.5;
  }

  .login-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s,
      transform 0.2s,
      box-shadow 0.2s;
  }

  .login-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .dialog-footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
</style>
