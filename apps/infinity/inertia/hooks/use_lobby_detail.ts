import { useState, useEffect } from 'react'
import { useLobbyService } from './use_lobby_service'
import { LobbyDetailState, LobbyData } from '../services/lobby_service'

/**
 * Hook pour gérer les détails d'un lobby avec mises à jour temps réel
 */
export function useLobbyDetail(lobbyUuid: string) {
  const { service: lobbyService, isConnected, error: sseError } = useLobbyService()
  const [state, setState] = useState<LobbyDetailState>({
    lobby: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!lobbyService || !lobbyUuid) {
      console.log('useLobbyDetail: Service ou UUID manquant', { lobbyService: !!lobbyService, lobbyUuid })
      return
    }

    console.log('useLobbyDetail: Initialisation pour lobby', lobbyUuid)
    setState((prev) => ({ ...prev, loading: true, error: null }))

    // S'abonner aux mises à jour du lobby
    const unsubscribe = lobbyService.subscribeLobbyDetail(lobbyUuid, (newState) => {
      console.log('useLobbyDetail: Nouvel état reçu:', newState)
      setState(newState)
    })

    // Charger les données initiales
    console.log('useLobbyDetail: Chargement des données initiales')
    lobbyService
      .fetchLobbyDetails(lobbyUuid)
      .then((lobby) => {
        console.log('useLobbyDetail: Données reçues:', lobby)
        setState({ lobby, loading: false, error: null })
      })
      .catch((error) => {
        console.error('useLobbyDetail: Erreur lors du chargement:', error)
        setState({ lobby: null, loading: false, error: error.message })
      })

    return unsubscribe
  }, [lobbyService, lobbyUuid])

  const leaveLobby = async (userUuid: string) => {
    if (!lobbyService || !lobbyUuid) throw new Error('Lobby service or UUID not available')
    return await lobbyService.leaveLobby(lobbyUuid, userUuid)
  }

  const startGame = async (userUuid: string) => {
    if (!lobbyService || !lobbyUuid) throw new Error('Lobby service or UUID not available')
    return await lobbyService.startGame(lobbyUuid, userUuid)
  }

  const joinLobby = async (userUuid: string) => {
    if (!lobbyService || !lobbyUuid) throw new Error('Lobby service or UUID not available')
    return await lobbyService.joinLobby(lobbyUuid, userUuid)
  }

  return {
    ...state,
    leaveLobby,
    startGame,
    joinLobby,
    isServiceReady: !!lobbyService,
  }
}
