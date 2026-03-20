import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

type MaybeHTMLElement = HTMLElement | null

interface UseDialogFocusTrapOptions {
  open: Ref<boolean>
  containerRef: Ref<MaybeHTMLElement>
  initialFocusRef?: Ref<MaybeHTMLElement>
  restoreFocusRef?: Ref<MaybeHTMLElement>
  onClose: () => void
  restoreFocusWhen?: () => boolean
}

export function useDialogFocusTrap(options: UseDialogFocusTrapOptions) {
  const lastFocusedElement = ref<MaybeHTMLElement>(null)

  function getFocusableElements() {
    if (!options.containerRef.value) return [] as HTMLElement[]

    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(options.containerRef.value.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
    )
  }

  async function focusInitialElement() {
    await nextTick()

    if (options.initialFocusRef?.value) {
      options.initialFocusRef.value.focus()
      return
    }

    const focusableElements = getFocusableElements()

    if (focusableElements.length > 0) {
      focusableElements[0].focus()
      return
    }

    options.containerRef.value?.focus()
  }

  async function restoreFocus() {
    if (options.restoreFocusWhen && !options.restoreFocusWhen()) return

    await nextTick()

    if (options.restoreFocusRef?.value?.isConnected) {
      options.restoreFocusRef.value.focus()
      return
    }

    if (lastFocusedElement.value?.isConnected) {
      lastFocusedElement.value.focus()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      options.onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (activeElement === firstElement || !options.containerRef.value?.contains(activeElement)) {
        event.preventDefault()
        lastElement.focus()
      }
      return
    }

    if (activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function handleFocusIn(event: FocusEvent) {
    if (!options.containerRef.value) return
    const target = event.target as Node | null
    if (target && !options.containerRef.value.contains(target)) {
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      } else {
        options.containerRef.value.focus()
      }
    }
  }

  watch(
    () => options.open.value,
    async (isOpen) => {
      if (isOpen) {
        lastFocusedElement.value = document.activeElement as HTMLElement | null
        await focusInitialElement()
        document.addEventListener('focusin', handleFocusIn)
        return
      }

      document.removeEventListener('focusin', handleFocusIn)
      await restoreFocus()
    }
  )

  onBeforeUnmount(() => {
    document.removeEventListener('focusin', handleFocusIn)
    if (!options.open.value) return
    void restoreFocus()
  })

  return {
    handleKeydown
  }
}
