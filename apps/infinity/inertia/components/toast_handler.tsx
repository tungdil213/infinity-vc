import { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'

interface ToastData {
  success?: string
  error?: string
  warning?: string
  info?: string
}

/**
 * Composant pour gérer automatiquement les toasts depuis les flash messages
 */
export function ToastHandler() {
  const { props } = usePage()
  const toastData = props.toast as ToastData

  useEffect(() => {
    if (toastData?.success) {
      toast.success(toastData.success)
    }
    if (toastData?.error) {
      toast.error(toastData.error)
    }
    if (toastData?.warning) {
      toast.warning(toastData.warning)
    }
    if (toastData?.info) {
      toast.info(toastData.info)
    }
  }, [toastData])

  return null
}
