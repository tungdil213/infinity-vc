import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useI18n } from '../i18n/use_i18n'

interface AutoLeaveLobbyProps {
  currentLobby: {
    uuid: string
    name: string
  } | null
  enabled?: boolean
}

export function AutoLeaveLobby({ currentLobby, enabled = true }: AutoLeaveLobbyProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!currentLobby || !enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show confirmation dialog when user tries to leave the page
      event.preventDefault()
      event.returnValue = t('guard.leaveLobbyConfirm')
      return event.returnValue
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched tabs or minimized window
        // We could implement a grace period here before auto-leaving
        console.log('User left the page, lobby:', currentLobby.name)
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentLobby, enabled, t])

  // Auto-leave function that can be called programmatically
  const autoLeaveLobby = async () => {
    if (!currentLobby) return

    try {
      await router.post(
        `/lobbies/${currentLobby.uuid}/leave`,
        {},
        {
          onSuccess: () => {
            toast.success(t('guard.autoLeaveSuccess', { lobbyName: currentLobby.name }))
          },
          onError: () => {
            toast.error(t('guard.autoLeaveError'))
          },
        }
      )
    } catch (error) {
      console.error('Auto-leave lobby error:', error)
    }
  }

  // This component doesn't render anything visible
  return null
}

// Hook version for more flexibility
export function useAutoLeaveLobby(
  currentLobby: { uuid: string; name: string } | null,
  enabled = true
) {
  const { t } = useI18n()

  useEffect(() => {
    if (!currentLobby || !enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = t('guard.leaveLobbyConfirm')
      return event.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentLobby, enabled, t])

  const autoLeaveLobby = async () => {
    if (!currentLobby) return

    try {
      await router.post(
        `/lobbies/${currentLobby.uuid}/leave`,
        {},
        {
          onSuccess: () => {
            toast.success(t('guard.autoLeaveSuccess', { lobbyName: currentLobby.name }))
          },
          onError: () => {
            toast.error(t('guard.autoLeaveError'))
          },
        }
      )
    } catch (error) {
      console.error('Auto-leave lobby error:', error)
    }
  }

  return { autoLeaveLobby }
}
