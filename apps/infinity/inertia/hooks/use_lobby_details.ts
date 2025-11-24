import { useEffect, useReducer, useRef } from 'react'
import { useLobbyContext } from '../contexts/LobbyContext'
import { LobbyDetailState, LobbyData } from '../services/lobby_service'
import { lobbyReducer, initialLobbyState, lobbyActions } from '../reducers/lobby_reducer'

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

  // Utiliser useReducer pour gérer l'état complexe de manière immutable
  const [state, dispatch] = useReducer(lobbyReducer, initialLobbyState)

  // Référence pour éviter les comparaisons JSON coûteuses
  const lastKnownLobbyRef = useRef<LobbyData | null>(null)

  // S'abonner aux détails du lobby quand l'UUID change
  useEffect(() => {
    if (!lobbyUuid) {
      dispatch(lobbyActions.reset())
      return
    }

    console.log(`🎯 useLobbyDetails: Abonnement au lobby ${lobbyUuid}`)

    // S'abonner aux mises à jour seulement si le service est disponible
    if (lobbyService) {
      subscribeLobbyDetails(lobbyUuid)

      // Charger IMMÉDIATEMENT les détails depuis l'API pour éviter délai de polling
      console.log(`🎯 useLobbyDetails: Chargement immédiat pour ${lobbyUuid}`)
      dispatch(lobbyActions.setLoading(true))

      lobbyService
        .fetchLobbyDetails(lobbyUuid)
        .then((lobbyData) => {
          if (lobbyData) {
            console.log(`🎯 useLobbyDetails: ✅ Données chargées pour ${lobbyUuid}`, {
              players: lobbyData.players?.length,
            })
            lastKnownLobbyRef.current = lobbyData
            dispatch(lobbyActions.setLobby(lobbyData))
          } else {
            console.log(`🎯 useLobbyDetails: ❌ Lobby non trouvé ${lobbyUuid}`)
            dispatch(lobbyActions.setError('Lobby non trouvé'))
          }
        })
        .catch((error) => {
          console.error(`🎯 useLobbyDetails: ❌ Erreur chargement ${lobbyUuid}:`, error)
          dispatch(lobbyActions.setError(error.message || 'Erreur lors du chargement'))
        })
    } else {
      console.warn(`🎯 useLobbyDetails: Service non disponible pour ${lobbyUuid}`)
      dispatch(lobbyActions.setLoading(true))
    }

    // Nettoyage lors du changement d'UUID ou démontage
    return () => {
      console.log(`🎯 useLobbyDetails: Désabonnement du lobby ${lobbyUuid}`)
      if (lobbyService) {
        unsubscribeLobbyDetails(lobbyUuid)
      }
    }
  }, [lobbyUuid, lobbyService])

  // Écouter les changements d'état depuis le contexte
  // Utiliser polling léger au lieu de dépendances sur localState pour éviter les boucles
  useEffect(() => {
    if (!lobbyUuid) return

    const pollInterval = setInterval(() => {
      const cachedState = getLobbyDetails(lobbyUuid)
      if (cachedState?.lobby) {
        // Vérifier si les données ont vraiment changé
        const hasChanged =
          JSON.stringify(cachedState.lobby) !== JSON.stringify(lastKnownLobbyRef.current)

        if (hasChanged) {
          console.log(
            `useLobbyDetails: Mise à jour depuis le contexte pour ${lobbyUuid}:`,
            cachedState
          )
          lastKnownLobbyRef.current = cachedState.lobby
          dispatch(lobbyActions.setLobby(cachedState.lobby))
        }
      }
    }, 100) // Poll toutes les 100ms

    return () => clearInterval(pollInterval)
  }, [lobbyUuid, getLobbyDetails])

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
    if (!state.lobby) return false
    return state.lobby.players.some((player) => player.uuid === userUuid)
  }

  const isUserCreator = (userUuid: string): boolean => {
    if (!state.lobby) return false
    return state.lobby.createdBy === userUuid
  }

  const canUserJoin = (userUuid: string): boolean => {
    if (!state.lobby) return false
    return (
      !isUserInLobby(userUuid) && state.lobby.hasAvailableSlots && state.lobby.status === 'WAITING'
    )
  }

  const canUserStart = (userUuid: string): boolean => {
    if (!state.lobby) return false
    return isUserCreator(userUuid) && state.lobby.canStart && state.lobby.status === 'WAITING'
  }

  return {
    // État
    lobby: state.lobby,
    loading: state.loading,
    error: state.error,

    // Actions
    joinLobby: handleJoinLobby,
    leaveLobby: handleLeaveLobby,
    startGame: handleStartGame,

    // Utilitaires
    isUserInLobby,
    isUserCreator,
    canUserJoin,
    canUserStart,
    isEmpty: !state.lobby && !state.loading,
    hasError: !!state.error,
  }
}
