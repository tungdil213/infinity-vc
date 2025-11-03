import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react'
import {
  LobbyService,
  LobbyData,
  LobbyListState,
  LobbyDetailState,
} from '../services/lobby_service'
import { useTransmit } from './TransmitContext'
import { initializeLobbyService } from '../services/lobby_service_singleton'

interface LobbyContextType {
  // Service instance
  lobbyService: LobbyService | null

  // Liste des lobbies
  lobbyListState: LobbyListState
  fetchLobbies: (filters?: any) => Promise<void>
  refreshLobbies: () => Promise<void>

  // Actions sur les lobbies
  createLobby: (data: any) => Promise<any>
  joinLobby: (lobbyUuid: string, userUuid: string) => Promise<any>
  leaveLobby: (lobbyUuid: string, userUuid: string) => Promise<any>
  startGame: (lobbyUuid: string, userUuid: string) => Promise<any>

  // Détails d'un lobby spécifique
  getLobbyDetails: (lobbyUuid: string) => LobbyDetailState | null
  subscribeLobbyDetails: (lobbyUuid: string) => void
  unsubscribeLobbyDetails: (lobbyUuid: string) => void
}

const LobbyContext = createContext<LobbyContextType>({
  lobbyService: null,
  lobbyListState: {
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  },
  fetchLobbies: async () => {},
  refreshLobbies: async () => {},
  createLobby: async () => null,
  joinLobby: async () => null,
  leaveLobby: async () => null,
  startGame: async () => null,
  getLobbyDetails: () => null,
  subscribeLobbyDetails: () => {},
  unsubscribeLobbyDetails: () => {},
})

interface LobbyProviderProps {
  children: React.ReactNode
}

export function LobbyProvider({ children }: LobbyProviderProps) {
  const transmitContext = useTransmit()

  // ✅ Utiliser le singleton global pour éviter les race conditions
  const lobbyService = useMemo(() => {
    if (!transmitContext) {
      return null
    }

    return initializeLobbyService(transmitContext)
  }, [transmitContext])

  const [lobbyListState, setLobbyListState] = useState<LobbyListState>({
    lobbies: [],
    loading: false,
    error: null,
    total: 0,
  })

  // Map pour stocker les états des détails de lobby
  const [lobbyDetailsStates, setLobbyDetailsStates] = useState<Map<string, LobbyDetailState>>(
    new Map()
  )

  // Références pour éviter les re-créations
  const unsubscribeListRef = useRef<(() => void) | null>(null)
  const unsubscribeDetailsRef = useRef<Map<string, () => void>>(new Map())

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (unsubscribeListRef.current) {
        unsubscribeListRef.current()
      }
      // Nettoyer tous les abonnements aux détails
      unsubscribeDetailsRef.current.forEach((unsubscribe) => {
        unsubscribe()
      })
      unsubscribeDetailsRef.current.clear()

      // Détruire le service
      if (lobbyService) {
        lobbyService.destroy()
      }
    }
  }, [lobbyService])

  const fetchLobbies = async (filters?: any) => {
    if (!lobbyService) {
      console.warn('LobbyProvider: Service non initialisé')
      return
    }

    console.log('LobbyProvider: Récupération des lobbies avec filtres:', filters)
    await lobbyService.fetchLobbies(filters)
  }

  const refreshLobbies = async () => {
    console.log('LobbyProvider: Rafraîchissement des lobbies')
    await fetchLobbies()
  }

  const createLobby = async (data: any) => {
    if (!lobbyService) throw new Error('Service non initialisé')
    return await lobbyService.createLobby(data)
  }

  const joinLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) throw new Error('Service non initialisé')
    return await lobbyService.joinLobby(lobbyUuid, userUuid)
  }

  const leaveLobby = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) throw new Error('Service non initialisé')
    return await lobbyService.leaveLobby(lobbyUuid, userUuid)
  }

  const startGame = async (lobbyUuid: string, userUuid: string) => {
    if (!lobbyService) throw new Error('Service non initialisé')
    return await lobbyService.startGame(lobbyUuid, userUuid)
  }

  const getLobbyDetails = useCallback(
    (lobbyUuid: string): LobbyDetailState | null => {
      return lobbyDetailsStates.get(lobbyUuid) || null
    },
    [lobbyDetailsStates]
  )

  const subscribeLobbyDetails = useCallback(
    (lobbyUuid: string) => {
      if (!lobbyService) {
        console.warn('LobbyProvider: Service non initialisé pour subscription détails')
        return
      }

      // Éviter les abonnements multiples
      if (unsubscribeDetailsRef.current.has(lobbyUuid)) {
        console.log(`LobbyProvider: Déjà abonné aux détails du lobby ${lobbyUuid}`)
        return
      }

      console.log(`LobbyProvider: Abonnement aux détails du lobby ${lobbyUuid}`)

      const unsubscribe = lobbyService.subscribeLobbyDetail(lobbyUuid, (newState) => {
        console.log(`LobbyProvider: Mise à jour des détails du lobby ${lobbyUuid}:`, newState)
        setLobbyDetailsStates((prev) => {
          const newMap = new Map(prev)
          newMap.set(lobbyUuid, newState)
          return newMap
        })
      })

      unsubscribeDetailsRef.current.set(lobbyUuid, unsubscribe)
    },
    [lobbyService]
  )

  const unsubscribeLobbyDetails = useCallback((lobbyUuid: string) => {
    const unsubscribe = unsubscribeDetailsRef.current.get(lobbyUuid)
    if (unsubscribe) {
      console.log(`LobbyProvider: Désabonnement des détails du lobby ${lobbyUuid}`)
      unsubscribe()
      unsubscribeDetailsRef.current.delete(lobbyUuid)

      // Supprimer l'état des détails
      setLobbyDetailsStates((prev) => {
        const newMap = new Map(prev)
        newMap.delete(lobbyUuid)
        return newMap
      })
    }
  }, [])

  // ✅ Mémoïser le context value pour garantir que React détecte les changements
  const contextValue: LobbyContextType = useMemo(
    () => ({
      lobbyService,
      lobbyListState,
      fetchLobbies,
      refreshLobbies,
      createLobby,
      joinLobby,
      leaveLobby,
      startGame,
      getLobbyDetails,
      subscribeLobbyDetails,
      unsubscribeLobbyDetails,
    }),
    [
      lobbyService,
      lobbyListState,
      fetchLobbies,
      refreshLobbies,
      createLobby,
      joinLobby,
      leaveLobby,
      startGame,
      getLobbyDetails,
      subscribeLobbyDetails,
      unsubscribeLobbyDetails,
    ]
  )

  // ✅ Toujours rendre - les hooks vont attendre que le service soit disponible
  return <LobbyContext.Provider value={contextValue}>{children}</LobbyContext.Provider>
}

// Contexte par défaut pour éviter les erreurs quand le provider n'est pas encore prêt
const defaultLobbyContext: LobbyContextType = {
  lobbyService: null,
  lobbyListState: {
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  },
  fetchLobbies: async () => {},
  refreshLobbies: async () => {},
  createLobby: async () => null,
  joinLobby: async () => null,
  leaveLobby: async () => null,
  startGame: async () => null,
  getLobbyDetails: () => null,
  subscribeLobbyDetails: () => {},
  unsubscribeLobbyDetails: () => {},
}

export function useLobbyContext() {
  const context = useContext(LobbyContext)
  return context
}
