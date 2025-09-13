import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { LobbyService, LobbyData, LobbyListState, LobbyDetailState } from '../services/lobby_service'
import { useTransmit } from './TransmitContext'

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

const LobbyContext = createContext<LobbyContextType | null>(null)

interface LobbyProviderProps {
  children: React.ReactNode
}

export function LobbyProvider({ children }: LobbyProviderProps) {
  const transmitContext = useTransmit()
  const [lobbyService, setLobbyService] = useState<LobbyService | null>(null)
  const [lobbyListState, setLobbyListState] = useState<LobbyListState>({
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  })
  
  // Map pour stocker les états des détails de lobby
  const [lobbyDetailsStates, setLobbyDetailsStates] = useState<Map<string, LobbyDetailState>>(new Map())
  
  // Références pour éviter les re-créations
  const unsubscribeListRef = useRef<(() => void) | null>(null)
  const unsubscribeDetailsRef = useRef<Map<string, () => void>>(new Map())

  // Initialiser le service quand le contexte Transmit est prêt
  useEffect(() => {
    if (transmitContext && !lobbyService) {
      console.log('LobbyProvider: Initialisation du LobbyService')
      const service = new LobbyService(transmitContext)
      setLobbyService(service)
      
      // S'abonner aux changements de la liste des lobbies
      const unsubscribe = service.subscribeLobbyList((newState) => {
        console.log('LobbyProvider: Mise à jour de la liste des lobbies:', newState)
        setLobbyListState(newState)
      })
      
      unsubscribeListRef.current = unsubscribe
      
      return () => {
        console.log('LobbyProvider: Nettoyage du service')
        unsubscribe()
        service.destroy()
      }
    }
  }, [transmitContext, lobbyService])

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
    }
  }, [])

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

  const getLobbyDetails = useCallback((lobbyUuid: string): LobbyDetailState | null => {
    return lobbyDetailsStates.get(lobbyUuid) || null
  }, [lobbyDetailsStates])

  const subscribeLobbyDetails = useCallback((lobbyUuid: string) => {
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
      setLobbyDetailsStates(prev => {
        const newMap = new Map(prev)
        newMap.set(lobbyUuid, newState)
        return newMap
      })
    })

    unsubscribeDetailsRef.current.set(lobbyUuid, unsubscribe)
  }, [lobbyService])

  const unsubscribeLobbyDetails = useCallback((lobbyUuid: string) => {
    const unsubscribe = unsubscribeDetailsRef.current.get(lobbyUuid)
    if (unsubscribe) {
      console.log(`LobbyProvider: Désabonnement des détails du lobby ${lobbyUuid}`)
      unsubscribe()
      unsubscribeDetailsRef.current.delete(lobbyUuid)
      
      // Supprimer l'état des détails
      setLobbyDetailsStates(prev => {
        const newMap = new Map(prev)
        newMap.delete(lobbyUuid)
        return newMap
      })
    }
  }, [])

  const contextValue: LobbyContextType = {
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
  }

  return (
    <LobbyContext.Provider value={contextValue}>
      {children}
    </LobbyContext.Provider>
  )
}

export function useLobbyContext() {
  const context = useContext(LobbyContext)
  if (!context) {
    throw new Error('useLobbyContext must be used within a LobbyProvider')
  }
  return context
}
