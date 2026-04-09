import { useEffect, useMemo } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { LobbyService } from '../services/lobby_service'

// Global instance to avoid duplicate service creation
let globalLobbyService: LobbyService | null = null

export function disposeLobbyService(): void {
  if (!globalLobbyService) {
    return
  }

  globalLobbyService.destroy()
  globalLobbyService = null
}

/**
 * Hook exposing the lobby service synchronized with the Transmit context.
 */
export function useLobbyService() {
  const transmitContext = useTransmit()

  // Create or reuse service instance
  const service = useMemo(() => {
    // Reuse global instance when available
    if (globalLobbyService) {
      return globalLobbyService
    }

    // Create a single instance even before Transmit is fully connected.
    // Context updates are pushed afterward via updateContext.
    globalLobbyService = new LobbyService(transmitContext)
    return globalLobbyService
  }, [transmitContext])

  // Keep service synchronized with latest Transmit context
  useEffect(() => {
    if (globalLobbyService) {
      globalLobbyService.updateContext(transmitContext)
    }
  }, [transmitContext])

  return {
    service,
    isConnected: transmitContext.isConnected,
    error: transmitContext.error,
  }
}
