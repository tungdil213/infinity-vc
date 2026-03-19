import { useState, useEffect } from 'react'
import { useLobbyService } from './use_lobby_service'
import { type LobbyListState } from '../services/lobby_service'

interface UseLobbyListOptions {
  status?: string
  hasSlots?: boolean
  includePrivate?: boolean
  autoRefresh?: boolean
}

/**
 * Handles lobby list state with realtime updates.
 */
export function useLobbyList(options: UseLobbyListOptions = {}) {
  const { service: lobbyService, isConnected, error: realtimeError } = useLobbyService()
  const [state, setState] = useState<LobbyListState>({
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  })

  useEffect(() => {
    if (!lobbyService) return

    // Subscribe to updates
    const unsubscribe = lobbyService.subscribeLobbyList(setState)

    // Load initial data
    lobbyService.fetchLobbies({
      status: options.status,
      hasSlots: options.hasSlots,
      includePrivate: options.includePrivate,
    })

    return unsubscribe
  }, [lobbyService, options.status, options.hasSlots, options.includePrivate])

  const refresh = () => {
    if (lobbyService) {
      lobbyService.fetchLobbies({
        status: options.status,
        hasSlots: options.hasSlots,
        includePrivate: options.includePrivate,
      })
    }
  }

  const createLobby = async (lobbyData: {
    name: string
    maxPlayers?: number
    isPrivate?: boolean
    userUuid: string
  }) => {
    if (!lobbyService) throw new Error('Lobby service not available')
    return await lobbyService.createLobby(lobbyData)
  }

  const joinLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) throw new Error('Lobby service not available')
    return await lobbyService.joinLobby(lobbyUuid, userUuid)
  }

  return {
    ...state,
    refresh,
    createLobby,
    joinLobby,
    isServiceReady: isConnected,
    realtimeError,
  }
}
