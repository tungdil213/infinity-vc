import { useEffect, useRef, useMemo } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import { LobbyService } from '../services/lobby_service'

// Instance globale pour éviter les duplications
let globalLobbyService: LobbyService | null = null

/**
 * Hook pour utiliser le service de lobbies avec Transmit
 */
export function useLobbyService() {
  const transmitContext = useTransmit()
  const isInitializedRef = useRef(false)

  // Utiliser useMemo pour créer le service une seule fois
  const service = useMemo(() => {
    if (!transmitContext.isConnected) {
      console.log('useLobbyService: En attente de la connexion Transmit')
      return null
    }

    // Réutiliser l'instance globale si elle existe
    if (globalLobbyService) {
      console.log('useLobbyService: Réutilisation de l\'instance globale')
      return globalLobbyService
    }

    console.log('useLobbyService: Création d\'une nouvelle instance LobbyService')
    globalLobbyService = new LobbyService(transmitContext)
    return globalLobbyService
  }, [transmitContext.isConnected])

  useEffect(() => {
    return () => {
      // Ne pas détruire l'instance globale lors du démontage d'un composant
      console.log('useLobbyService: Démontage du hook (instance préservée)')
    }
  }, [])

  return {
    service,
    isConnected: transmitContext.isConnected,
    error: transmitContext.error,
  }
}
