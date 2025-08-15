import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'

interface AutoLeaveLobbyProps {
  currentLobby: {
    uuid: string
    name: string
  } | null
  enabled?: boolean
}

export function AutoLeaveLobby({ currentLobby, enabled = true }: AutoLeaveLobbyProps) {
  useEffect(() => {
    if (!currentLobby || !enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show confirmation dialog when user tries to leave the page
      event.preventDefault()
      event.returnValue = 'Vous êtes actuellement dans un lobby. Voulez-vous vraiment quitter ?'
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
  }, [currentLobby, enabled])

  // Auto-leave function that can be called programmatically
  const autoLeaveLobby = async () => {
    if (!currentLobby) return

    try {
      await router.post(`/lobbies/${currentLobby.uuid}/leave`, {}, {
        onSuccess: () => {
          toast.success(`Vous avez automatiquement quitté le lobby "${currentLobby.name}"`)
        },
        onError: () => {
          toast.error('Erreur lors de la sortie automatique du lobby')
        }
      })
    } catch (error) {
      console.error('Auto-leave lobby error:', error)
    }
  }

  // This component doesn't render anything visible
  return null
}

// Hook version for more flexibility
export function useAutoLeaveLobby(currentLobby: { uuid: string; name: string } | null, enabled = true) {
  useEffect(() => {
    if (!currentLobby || !enabled) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'Vous êtes actuellement dans un lobby. Voulez-vous vraiment quitter ?'
      return event.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentLobby, enabled])

  const autoLeaveLobby = async () => {
    if (!currentLobby) return

    try {
      await router.post(`/lobbies/${currentLobby.uuid}/leave`, {}, {
        onSuccess: () => {
          toast.success(`Vous avez automatiquement quitté le lobby "${currentLobby.name}"`)
        },
        onError: () => {
          toast.error('Erreur lors de la sortie automatique du lobby')
        }
      })
    } catch (error) {
      console.error('Auto-leave lobby error:', error)
    }
  }

  return { autoLeaveLobby }
}
