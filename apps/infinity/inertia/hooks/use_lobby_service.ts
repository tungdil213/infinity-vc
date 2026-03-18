import { useEffect, useMemo } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { LobbyService } from '../services/lobby_service'

// Instance globale pour éviter les duplications
let globalLobbyService: LobbyService | null = null

export function disposeLobbyService(): void {
  if (!globalLobbyService) {
    return
  }

  globalLobbyService.destroy()
  globalLobbyService = null
}

/**
 * Hook pour utiliser le service de lobbies avec Transmit
 */
export function useLobbyService() {
  const transmitContext = useTransmit()

  // Créer ou récupérer le service
  const service = useMemo(() => {
    // Réutiliser l'instance globale si elle existe déjà
    if (globalLobbyService) {
      console.log("useLobbyService: Réutilisation de l'instance globale")
      return globalLobbyService
    }

    // Créer une nouvelle instance une seule fois, même si la connexion Transmit
    // n'est pas encore établie. Le contexte sera synchronisé ensuite via updateContext.
    console.log("useLobbyService: Création d'une nouvelle instance LobbyService")
    globalLobbyService = new LobbyService(transmitContext)
    return globalLobbyService
  }, [transmitContext])

  // Toujours synchroniser le service avec la dernière version du contexte Transmit
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
