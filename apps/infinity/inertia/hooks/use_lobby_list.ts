import { useState, useEffect, useRef } from 'react'
import { useLobbyContext } from '../contexts/LobbyContext'
import { LobbyListState, convertLobbyListState } from '../types/lobby'
import { getLobbyService } from '../services/lobby_service_singleton'

interface UseLobbyListOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  filters?: {
    status?: string
    hasAvailableSlots?: boolean
  }
}

/**
 * Hook pour gérer la liste des lobbies avec mises à jour temps réel
 * Respecte les patterns documentés avec logging standardisé et timeout protection
 * Architecture: Inertia = source de vérité initiale, Transmit = mises à jour temps réel
 */
export function useLobbyList(options: UseLobbyListOptions = {}, initialLobbies: any[] = []) {
  // ✅ Lire le singleton global au lieu du Context (évite les race conditions)
  const lobbyService = getLobbyService()

  // Utiliser les données Inertia comme état initial
  const [localState, setLocalState] = useState<LobbyListState>({
    lobbies: initialLobbies,
    loading: false,
    error: null,
    total: initialLobbies.length,
  })

  const [timeoutReached, setTimeoutReached] = useState(false)
  const lastUpdateRef = useRef(Date.now())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Timeout protection - 5 seconds max loading
  useEffect(() => {
    if (localState.loading && !timeoutReached) {
      timeoutRef.current = setTimeout(() => {
        setTimeoutReached(true)
        setLocalState((prev) => ({ ...prev, loading: false, error: null }))
      }, 5000)
    } else if (!localState.loading && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [localState.loading, timeoutReached])

  // Initialiser le service avec les données Inertia et s'abonner aux mises à jour
  useEffect(() => {
    if (!lobbyService) {
      return
    }

    // Initialiser le service avec les données Inertia
    lobbyService.initializeWithInertiaData(initialLobbies)

    // S'abonner aux mises à jour temps réel
    const unsubscribe = lobbyService.subscribeLobbyList((newState) => {
      const now = Date.now()

      // Throttle: max 10 updates/seconde (100ms)
      if (now - lastUpdateRef.current > 100) {
        const convertedState = convertLobbyListState(newState)
        setLocalState(convertedState)
        lastUpdateRef.current = now
      }
    })

    // Cleanup
    return () => unsubscribe()
  }, [lobbyService]) // ✅ Dépend UNIQUEMENT de lobbyService pour se ré-exécuter quand il devient disponible

  // Actions
  const refresh = async () => {
    if (!lobbyService) {
      return
    }

    try {
      await lobbyService.fetchLobbies(options.filters)
    } catch (error) {
      console.error('🎯 useLobbyList: Refresh failed', error)
    }
  }

  const createLobby = async (lobbyData: any) => {
    if (!lobbyService) {
      return
    }

    try {
      return await lobbyService.createLobby(lobbyData)
    } catch (error) {
      console.error('🎯 useLobbyList: Create lobby failed', error)
      throw error
    }
  }

  const joinLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) {
      return
    }

    try {
      return await lobbyService.joinLobby(lobbyUuid, userUuid)
    } catch (error) {
      console.error('🎯 useLobbyList: Join lobby failed', error)
      throw error
    }
  }

  const leaveLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) {
      return
    }

    try {
      return await lobbyService.leaveLobby(lobbyUuid, userUuid)
    } catch (error) {
      console.error('🎯 useLobbyList: Leave lobby failed', error)
      throw error
    }
  }

  return {
    ...localState,
    timeoutReached,
    refresh,
    createLobby,
    joinLobby,
    leaveLobby,
  }
}
