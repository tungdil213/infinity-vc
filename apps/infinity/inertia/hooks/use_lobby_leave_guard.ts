import { useEffect, useRef } from 'react'
import { router } from '@inertiajs/react'

interface UseLobbyLeaveGuardOptions {
  isInLobby: boolean
  lobbyUuid?: string
  userUuid?: string
  onLeaveLobby?: (lobbyUuid: string, userUuid: string) => Promise<void>
}

/**
 * Hook pour gérer la confirmation de sortie du lobby lors de la fermeture de page
 */
export function useLobbyLeaveGuard({
  isInLobby,
  lobbyUuid,
  userUuid,
  onLeaveLobby,
}: UseLobbyLeaveGuardOptions) {
  const isLeavingRef = useRef(false)

  useEffect(() => {
    if (!isInLobby || !lobbyUuid || !userUuid || !onLeaveLobby) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isLeavingRef.current) {
        return
      }

      // Afficher la confirmation de fermeture
      event.preventDefault()
      event.returnValue = 'Vous êtes actuellement dans un lobby. Voulez-vous vraiment quitter ?'
      return event.returnValue
    }

    const handleUnload = async () => {
      if (isLeavingRef.current) {
        return
      }

      try {
        // Marquer qu'on quitte pour éviter les appels multiples
        isLeavingRef.current = true

        // Utiliser sendBeacon pour envoyer la requête de façon fiable
        const data = JSON.stringify({
          lobbyUuid,
          userUuid,
        })

        navigator.sendBeacon('/api/v1/lobbies/leave-on-close', data)
      } catch (error) {
        console.error('Erreur lors de la sortie automatique du lobby:', error)
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && !isLeavingRef.current) {
        try {
          // Marquer qu'on quitte pour éviter les appels multiples
          isLeavingRef.current = true

          // Tentative de sortie du lobby quand la page devient cachée
          const data = JSON.stringify({
            lobbyUuid,
            userUuid,
          })

          navigator.sendBeacon('/api/v1/lobbies/leave-on-close', data)
        } catch (error) {
          console.error('Erreur lors de la sortie automatique du lobby:', error)
        }
      }
    }

    // Gérer la navigation Inertia
    const handleInertiaStart = (event: any) => {
      if (isLeavingRef.current) {
        return
      }

      const url = event.detail.visit.url
      const currentPath = window.location.pathname

      // Si on quitte la page du lobby, demander confirmation
      if (currentPath.includes('/lobby/') && !url.includes('/lobby/')) {
        const shouldLeave = window.confirm(
          'Vous êtes actuellement dans un lobby. Voulez-vous vraiment quitter ?'
        )

        if (!shouldLeave) {
          event.preventDefault()
          return
        }

        // Marquer qu'on est en train de quitter pour éviter les doubles appels
        isLeavingRef.current = true

        // Quitter le lobby de façon asynchrone
        onLeaveLobby(lobbyUuid, userUuid).catch((error) => {
          console.error('Erreur lors de la sortie du lobby:', error)
        })
      }
    }

    // Ajouter les listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('inertia:start', handleInertiaStart)

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('inertia:start', handleInertiaStart)
    }
  }, [isInLobby, lobbyUuid, userUuid, onLeaveLobby])

  // Fonction pour marquer qu'on quitte volontairement (pour éviter la confirmation)
  const markAsLeaving = () => {
    isLeavingRef.current = true
  }

  return { markAsLeaving }
}
