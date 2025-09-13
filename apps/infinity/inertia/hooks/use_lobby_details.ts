import { useEffect, useState } from 'react'
import { useLobbyContext } from '../contexts/LobbyContext'
import { LobbyDetailState, LobbyData } from '../services/lobby_service'

export function useLobbyDetails(lobbyUuid: string | null) {
  const {
    lobbyService,
    getLobbyDetails,
    subscribeLobbyDetails,
    unsubscribeLobbyDetails,
    joinLobby,
    leaveLobby,
    startGame,
  } = useLobbyContext()

  const [localState, setLocalState] = useState<LobbyDetailState>({
    lobby: null,
    loading: true,
    error: null,
  })

  // S'abonner aux détails du lobby quand l'UUID change
  useEffect(() => {
    if (!lobbyUuid) {
      setLocalState({
        lobby: null,
        loading: false,
        error: null,
      })
      return
    }

    console.log(`useLobbyDetails: Abonnement au lobby ${lobbyUuid}`)

    // S'abonner aux mises à jour
    subscribeLobbyDetails(lobbyUuid)
    // Charger les détails initiaux si pas déjà en cache
    const cachedState = getLobbyDetails(lobbyUuid)
    if (cachedState) {
      console.log(`useLobbyDetails: État en cache trouvé pour ${lobbyUuid}:`, cachedState)
      setLocalState(cachedState)
    } else {
      console.log(`useLobbyDetails: Chargement des détails pour ${lobbyUuid}`)
      setLocalState({
        lobby: null,
        loading: true,
        error: null,
      })

      // Charger les détails depuis l'API
      if (lobbyService) {
        lobbyService
          .fetchLobbyDetails(lobbyUuid)
          .then((lobbyData) => {
            if (lobbyData) {
              const newState: LobbyDetailState = {
                lobby: lobbyData,
                loading: false,
                error: null,
              }
              setLocalState(newState)
            } else {
              setLocalState({
                lobby: null,
                loading: false,
                error: 'Lobby non trouvé',
              })
            }
          })
          .catch((error) => {
            console.error(`useLobbyDetails: Erreur lors du chargement de ${lobbyUuid}:`, error)
            setLocalState({
              lobby: null,
              loading: false,
              error: error.message || 'Erreur lors du chargement',
            })
          })
      }
    }

    // Nettoyage lors du changement d'UUID ou démontage
    return () => {
      console.log(`useLobbyDetails: Désabonnement du lobby ${lobbyUuid}`)
      unsubscribeLobbyDetails(lobbyUuid)
    }
  }, [lobbyUuid])

  // Écouter les changements d'état depuis le contexte
  useEffect(() => {
    if (!lobbyUuid) return

    const cachedState = getLobbyDetails(lobbyUuid)
    if (cachedState && JSON.stringify(cachedState) !== JSON.stringify(localState)) {
      console.log(`useLobbyDetails: Mise à jour depuis le contexte pour ${lobbyUuid}:`, cachedState)
      setLocalState(cachedState)
    }
  }, [lobbyUuid, getLobbyDetails, localState])

  const handleJoinLobby = async (userUuid: string) => {
    if (!lobbyUuid) throw new Error('Aucun lobby sélectionné')

    console.log(`useLobbyDetails: Rejoindre le lobby ${lobbyUuid}`)
    try {
      const result = await joinLobby(lobbyUuid, userUuid)
      console.log(`useLobbyDetails: Lobby ${lobbyUuid} rejoint avec succès:`, result)
      return result
    } catch (error) {
      console.error(`useLobbyDetails: Erreur lors de la jonction au lobby ${lobbyUuid}:`, error)
      throw error
    }
  }

  const handleLeaveLobby = async (userUuid: string) => {
    if (!lobbyUuid) throw new Error('Aucun lobby sélectionné')

    console.log(`useLobbyDetails: Quitter le lobby ${lobbyUuid}`)
    try {
      const result = await leaveLobby(lobbyUuid, userUuid)
      console.log(`useLobbyDetails: Lobby ${lobbyUuid} quitté avec succès:`, result)
      return result
    } catch (error) {
      console.error(`useLobbyDetails: Erreur lors de la sortie du lobby ${lobbyUuid}:`, error)
      throw error
    }
  }

  const handleStartGame = async (userUuid: string) => {
    if (!lobbyUuid) throw new Error('Aucun lobby sélectionné')

    console.log(`useLobbyDetails: Démarrer le jeu pour le lobby ${lobbyUuid}`)
    try {
      const result = await startGame(lobbyUuid, userUuid)
      console.log(`useLobbyDetails: Jeu démarré pour le lobby ${lobbyUuid}:`, result)
      return result
    } catch (error) {
      console.error(`useLobbyDetails: Erreur lors du démarrage du jeu pour ${lobbyUuid}:`, error)
      throw error
    }
  }

  const isUserInLobby = (userUuid: string): boolean => {
    if (!localState.lobby) return false
    return localState.lobby.players.some((player) => player.uuid === userUuid)
  }

  const isUserCreator = (userUuid: string): boolean => {
    if (!localState.lobby) return false
    return localState.lobby.createdBy === userUuid
  }

  const canUserJoin = (userUuid: string): boolean => {
    if (!localState.lobby) return false
    return (
      !isUserInLobby(userUuid) &&
      localState.lobby.hasAvailableSlots &&
      localState.lobby.status === 'WAITING'
    )
  }

  const canUserStart = (userUuid: string): boolean => {
    if (!localState.lobby) return false
    return (
      isUserCreator(userUuid) && localState.lobby.canStart && localState.lobby.status === 'WAITING'
    )
  }

  return {
    // État
    lobby: localState.lobby,
    loading: localState.loading,
    error: localState.error,

    // Actions
    joinLobby: handleJoinLobby,
    leaveLobby: handleLeaveLobby,
    startGame: handleStartGame,

    // Utilitaires
    isUserInLobby,
    isUserCreator,
    canUserJoin,
    canUserStart,
    isEmpty: !localState.lobby && !localState.loading,
    hasError: !!localState.error,
  }
}
