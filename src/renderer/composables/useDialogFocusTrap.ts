import { type Ref } from 'vue'
import { useFocusLoop, type MaybeContainer } from './useFocusLoop'

interface UseDialogFocusTrapOptions {
  open: Ref<boolean>
  containerRef: Ref<MaybeContainer>
  initialFocusRef?: Ref<MaybeContainer>
  restoreFocusRef?: Ref<MaybeContainer>
  excludeRef?: Ref<MaybeContainer>
  onClose: () => void
  restoreFocusWhen?: () => boolean
}

export function useDialogFocusTrap(options: UseDialogFocusTrapOptions) {
  const { handleKeydown } = useFocusLoop({
    open: options.open,
    containerRef: options.containerRef,
    initialFocusRef: options.initialFocusRef,
    restoreFocusRef: options.restoreFocusRef,
    excludeRef: options.excludeRef,
    onEscape: options.onClose,
    restoreFocusWhen: options.restoreFocusWhen,
    trapFocusOutside: true
  })

  return {
    handleKeydown
  }
}
