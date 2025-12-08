import { useEffect, useMemo, useRef } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { LobbyService } from '../services/lobby_service'

// Instance globale pour éviter les duplications
let globalLobbyService: LobbyService | null = null

/**
 * Hook pour utiliser le service de lobbies avec Transmit
 */
export function useLobbyService() {
  const transmitContext = useTransmit()
  const hasUpdatedContext = useRef(false)

  // Créer ou récupérer le service
  const service = useMemo(() => {
    if (!transmitContext.isConnected) {
      console.log('useLobbyService: En attente de la connexion Transmit')
      return globalLobbyService // Retourner l'instance existante même si non connecté
    }

    // Réutiliser l'instance globale si elle existe
    if (globalLobbyService) {
      console.log("useLobbyService: Réutilisation de l'instance globale")
      return globalLobbyService
    }

    console.log("useLobbyService: Création d'une nouvelle instance LobbyService")
    globalLobbyService = new LobbyService(transmitContext)
    return globalLobbyService
  }, [transmitContext.isConnected])

  // Mettre à jour le contexte quand la connexion change
  useEffect(() => {
    if (transmitContext.isConnected && globalLobbyService && !hasUpdatedContext.current) {
      console.log('useLobbyService: Connexion établie, mise à jour du contexte')
      globalLobbyService.updateContext(transmitContext)
      hasUpdatedContext.current = true
    }
  }, [transmitContext.isConnected, transmitContext])

  // Reset le flag quand on se déconnecte
  useEffect(() => {
    if (!transmitContext.isConnected) {
      hasUpdatedContext.current = false
    }
  }, [transmitContext.isConnected])

  return {
    service,
    isConnected: transmitContext.isConnected,
    error: transmitContext.error,
  }
}
