import { nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance, type Ref } from 'vue'

export type MaybeContainer = HTMLElement | ComponentPublicInstance | null

export function toEl(value: MaybeContainer | undefined): HTMLElement | null {
  if (!value) return null
  if (value instanceof HTMLElement) return value
  return (value as ComponentPublicInstance).$el ?? null
}

export function getFocusableElementsIn(containerEl: ParentNode | null, excludeEl?: HTMLElement | null) {
  if (!containerEl) {
    return [] as HTMLElement[]
  }

  const selectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ')

  return Array.from(containerEl.querySelectorAll<HTMLElement>(selectors)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.offsetParent !== null &&
      !(excludeEl && excludeEl.contains(element))
  )
}

interface UseFocusLoopOptions {
  open: Ref<boolean>
  containerRef: Ref<MaybeContainer>
  initialFocusRef?: Ref<MaybeContainer>
  restoreFocusRef?: Ref<MaybeContainer>
  excludeRef?: Ref<MaybeContainer>
  onEscape?: () => void
  restoreFocusWhen?: () => boolean
  trapFocusOutside?: boolean
}

export function useFocusLoop(options: UseFocusLoopOptions) {
  const lastFocusedElement = ref<HTMLElement | null>(null)

  function getFocusableElements() {
    return getFocusableElementsIn(toEl(options.containerRef.value), toEl(options.excludeRef?.value))
  }

  async function focusInitialElement() {
    await nextTick()

    const initialFocusEl = toEl(options.initialFocusRef?.value)
    if (initialFocusEl) {
      initialFocusEl.focus()
      return
    }

    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
      return
    }

    toEl(options.containerRef.value)?.focus()
  }

  async function restoreFocus() {
    if (options.restoreFocusWhen && !options.restoreFocusWhen()) return

    await nextTick()

    const restoreFocusEl = toEl(options.restoreFocusRef?.value)
    if (restoreFocusEl?.isConnected) {
      restoreFocusEl.focus()
      return
    }

    if (lastFocusedElement.value?.isConnected) {
      lastFocusedElement.value.focus()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!options.open.value) return

    if (event.key === 'Escape') {
      if (!options.onEscape) return
      event.preventDefault()
      options.onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement | null
    const containerEl = toEl(options.containerRef.value)

    if (event.shiftKey) {
      if (activeElement === firstElement || !containerEl?.contains(activeElement)) {
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
    if (!options.trapFocusOutside || !options.open.value) return

    const containerEl = toEl(options.containerRef.value)
    if (!containerEl) return

    const target = event.target as Node | null
    if (target && toEl(options.excludeRef?.value)?.contains(target)) return

    if (target && !containerEl.contains(target)) {
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      } else {
        containerEl.focus()
      }
    }
  }

  watch(
    () => options.open.value,
    async (isOpen) => {
      if (isOpen) {
        lastFocusedElement.value = document.activeElement as HTMLElement | null
        await focusInitialElement()
        if (options.trapFocusOutside) {
          document.addEventListener('focusin', handleFocusIn)
        }
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
    getFocusableElements,
    focusInitialElement,
    restoreFocus,
    handleKeydown
  }
}
