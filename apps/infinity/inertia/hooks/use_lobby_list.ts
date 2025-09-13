import { useState, useEffect, useRef } from 'react'
import { useLobbyContext } from '../contexts/LobbyContext'
import { LobbyListState, convertLobbyListState } from '../types/lobby'

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
 */
export function useLobbyList(options: UseLobbyListOptions = {}) {
  console.log('🎯 useLobbyList: Hook initialized with options', options)

  const lobbyContext = useLobbyContext()
  const { lobbyService } = lobbyContext
  const [localState, setLocalState] = useState<LobbyListState>({
    lobbies: [],
    loading: false,
    error: null,
    total: 0,
  })
  const [timeoutReached, setTimeoutReached] = useState(false)
  const lastUpdateRef = useRef(Date.now())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Timeout protection - 10 seconds max loading
  useEffect(() => {
    if (localState.loading && !timeoutReached) {
      console.log('🎮 useLobbyList: Starting timeout protection (10s)')
      timeoutRef.current = setTimeout(() => {
        console.warn('🎮 useLobbyList: Timeout reached, stopping loading state')
        setTimeoutReached(true)
        setLocalState((prev) => ({ ...prev, loading: false, error: 'Connection timeout' }))
      }, 10000)
    } else if (!localState.loading && timeoutRef.current) {
      console.log('🎮 useLobbyList: Clearing timeout protection')
      clearTimeout(timeoutRef.current)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [localState.loading, timeoutReached])

  // Subscribe to lobby list updates from service
  useEffect(() => {
    if (!lobbyService) {
      console.warn('🎯 useLobbyList: No lobby service available, keeping empty state')
      return
    }

    console.log('🎯 useLobbyList: Subscribing to lobby list updates')

    // Fetch initial data when service becomes available
    lobbyService.fetchLobbies(options.filters).catch((error) => {
      console.error('🎯 useLobbyList: Initial fetch failed', error)
    })

    // Subscribe to updates with throttling
    const unsubscribe = lobbyService.subscribeLobbyList((newState) => {
      const now = Date.now()
      if (now - lastUpdateRef.current > 100) {
        // Throttle to max 10 updates per second
        console.log('🎯 useLobbyList: Received lobby list update', {
          lobbyCount: newState.lobbies.length,
          loading: newState.loading,
        })
        // Convert service state to typed state
        const convertedState = convertLobbyListState(newState)
        setLocalState(convertedState)
        lastUpdateRef.current = now
      }
    })

    return () => {
      console.log('🎯 useLobbyList: Unsubscribing from lobby list updates')
      unsubscribe()
    }
  }, [lobbyService, options.filters])

  // Actions
  const refresh = async () => {
    if (!lobbyService) {
      console.warn('🎯 useLobbyList: Cannot refresh - no service available')
      return
    }

    console.log('🎯 useLobbyList: Manual refresh triggered')
    try {
      await lobbyService.fetchLobbies(options.filters)
    } catch (error) {
      console.error('🎯 useLobbyList: Refresh failed', error)
    }
  }

  const createLobby = async (lobbyData: any) => {
    if (!lobbyService) {
      console.warn('🎯 useLobbyList: Cannot create lobby - no service available')
      return
    }

    console.log('🎮 useLobbyList: Creating lobby', lobbyData)
    try {
      return await lobbyService.createLobby(lobbyData)
    } catch (error) {
      console.error('🎮 useLobbyList: Create lobby failed', error)
      throw error
    }
  }

  const joinLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) {
      console.warn('🎮 useLobbyList: Cannot join lobby - no service available')
      return
    }

    console.log('🎮 useLobbyList: Joining lobby', { lobbyUuid, userUuid })
    try {
      return await lobbyService.joinLobby(lobbyUuid, userUuid)
    } catch (error) {
      console.error('🎮 useLobbyList: Join lobby failed', error)
      throw error
    }
  }

  const leaveLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) {
      console.warn('🎮 useLobbyList: Cannot leave lobby - no service available')
      return
    }

    console.log('🎮 useLobbyList: Leaving lobby', { lobbyUuid, userUuid })
    try {
      return await lobbyService.leaveLobby(lobbyUuid, userUuid)
    } catch (error) {
      console.error('🎮 useLobbyList: Leave lobby failed', error)
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
