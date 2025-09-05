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
    if (!lobbyService || !lobbyUuid) return

    setState((prev) => ({ ...prev, loading: true, error: null }))

    // S'abonner aux mises à jour du lobby
    const unsubscribe = lobbyService.subscribeLobbyDetail(lobbyUuid, setState)

    // Charger les données initiales
    lobbyService
      .fetchLobbyDetails(lobbyUuid)
      .then((lobby) => {
        setState({ lobby, loading: false, error: null })
      })
      .catch((error) => {
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
