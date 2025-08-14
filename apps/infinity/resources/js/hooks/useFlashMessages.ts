import { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { useToast } from '../context/ToastContext'

interface FlashMessages {
  success?: string
  error?: string
  info?: string
  warning?: string
}

export function useFlashMessages() {
  const { props } = usePage()
  const { showSuccess, showError, showInfo, showWarning } = useToast()

  useEffect(() => {
    const flash = props.flash as FlashMessages | undefined

    if (flash?.success) {
      showSuccess(flash.success)
    }

    if (flash?.error) {
      showError(flash.error)
    }

    if (flash?.info) {
      showInfo(flash.info)
    }

    if (flash?.warning) {
      showWarning(flash.warning)
    }
  }, [props.flash, showSuccess, showError, showInfo, showWarning])
}
