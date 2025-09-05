import { useEffect, useRef } from 'react'
import { useSSEContext } from '../contexts/SSEContext'
import { LobbyService } from '../services/LobbyService'

/**
 * Hook pour utiliser le service de lobbies avec SSE
 */
export function useLobbyService() {
  const sseContext = useSSEContext()
  const lobbyServiceRef = useRef<LobbyService | null>(null)

  useEffect(() => {
    // Créer le service immédiatement, même si pas encore connecté
    if (!lobbyServiceRef.current) {
      lobbyServiceRef.current = new LobbyService(sseContext)
    }

    return () => {
      if (lobbyServiceRef.current) {
        lobbyServiceRef.current.destroy()
        lobbyServiceRef.current = null
      }
    }
  }, [sseContext])

  return {
    service: lobbyServiceRef.current,
    isConnected: sseContext.isConnected,
    connectionId: sseContext.connectionId,
    error: sseContext.error,
  }
}
