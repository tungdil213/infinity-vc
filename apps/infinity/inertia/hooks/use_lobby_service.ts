import { useEffect, useRef } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { LobbyService } from '../services/lobby_service'

/**
 * Hook pour utiliser le service de lobbies avec Transmit
 */
export function useLobbyService() {
  const transmitContext = useTransmit()
  const lobbyServiceRef = useRef<LobbyService | null>(null)

  useEffect(() => {
    // Créer le service immédiatement, même si pas encore connecté
    if (!lobbyServiceRef.current) {
      lobbyServiceRef.current = new LobbyService(transmitContext)
    }

    return () => {
      if (lobbyServiceRef.current) {
        lobbyServiceRef.current.destroy()
        lobbyServiceRef.current = null
      }
    }
  }, [transmitContext])

  return {
    service: lobbyServiceRef.current,
    isConnected: transmitContext.isConnected,
    error: transmitContext.error,
  }
}
