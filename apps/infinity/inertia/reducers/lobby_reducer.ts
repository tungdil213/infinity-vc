import { LobbyData } from '../services/lobby_service'

/**
 * Actions pour le reducer de lobby
 */
export type LobbyAction =
  | { type: 'SET_LOBBY'; payload: LobbyData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'PLAYER_JOINED'; payload: { player: any; playerCount: number } }
  | { type: 'PLAYER_LEFT'; payload: { playerUuid: string; playerCount: number } }
  | { type: 'STATUS_CHANGED'; payload: { status: string } }
  | { type: 'UPDATE_LOBBY'; payload: Partial<LobbyData> }
  | { type: 'RESET' }

/**
 * État du lobby
 */
export interface LobbyState {
  lobby: LobbyData | null
  loading: boolean
  error: string | null
}

/**
 * État initial
 */
export const initialLobbyState: LobbyState = {
  lobby: null,
  loading: true,
  error: null,
}

/**
 * Reducer pour gérer l'état du lobby de manière immutable
 *
 * Architecture SOLID:
 * - Toutes les modifications passent par des actions
 * - Immutabilité stricte (spread operators)
 * - Prévisible et testable
 * - React détecte tous les changements
 */
export function lobbyReducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case 'SET_LOBBY': {
      console.log('📦 LobbyReducer: SET_LOBBY', action.payload)

      // Fusionner intelligemment avec l'état existant pour préserver les données
      // Si on a un lobby existant, fusionner au lieu de remplacer complètement
      const mergedLobby = state.lobby ? { ...state.lobby, ...action.payload } : action.payload

      console.log('📦 LobbyReducer: Lobby fusionné', {
        hadPlayers: !!state.lobby?.players?.length,
        newHasPlayers: !!mergedLobby.players?.length,
        playersCount: mergedLobby.players?.length,
      })

      return {
        ...state,
        lobby: mergedLobby,
        loading: false,
        error: null,
      }
    }

    case 'SET_LOADING': {
      console.log('📦 LobbyReducer: SET_LOADING', action.payload)
      return {
        ...state,
        loading: action.payload,
      }
    }

    case 'SET_ERROR': {
      console.log('📦 LobbyReducer: SET_ERROR', action.payload)
      return {
        ...state,
        error: action.payload,
        loading: false,
      }
    }

    case 'PLAYER_JOINED': {
      if (!state.lobby) {
        console.warn('📦 LobbyReducer: PLAYER_JOINED - No lobby to update')
        return state
      }

      const { player, playerCount } = action.payload
      console.log('📦 LobbyReducer: PLAYER_JOINED', { player, playerCount })

      // Vérifier si le joueur existe déjà
      const playerExists = state.lobby.players.some((p) => p.uuid === player.uuid)
      if (playerExists) {
        console.log('📦 LobbyReducer: Player already in lobby, skipping')
        return state
      }

      // IMMUTABILITÉ STRICTE: Créer nouveau tableau avec spread
      const updatedPlayers = [...state.lobby.players, player]

      return {
        ...state,
        lobby: {
          ...state.lobby,
          players: updatedPlayers, // ✅ Nouveau tableau
          currentPlayers: playerCount,
          hasAvailableSlots: playerCount < state.lobby.maxPlayers,
        },
      }
    }

    case 'PLAYER_LEFT': {
      if (!state.lobby) {
        console.warn('📦 LobbyReducer: PLAYER_LEFT - No lobby to update')
        return state
      }

      const { playerUuid, playerCount } = action.payload
      console.log('📦 LobbyReducer: PLAYER_LEFT', { playerUuid, playerCount })

      // IMMUTABILITÉ STRICTE: Filter crée un nouveau tableau
      const updatedPlayers = state.lobby.players.filter((p) => p.uuid !== playerUuid)

      return {
        ...state,
        lobby: {
          ...state.lobby,
          players: updatedPlayers, // ✅ Nouveau tableau
          currentPlayers: playerCount,
          hasAvailableSlots: playerCount < state.lobby.maxPlayers,
        },
      }
    }

    case 'STATUS_CHANGED': {
      if (!state.lobby) {
        console.warn('📦 LobbyReducer: STATUS_CHANGED - No lobby to update')
        return state
      }

      const { status } = action.payload
      console.log('📦 LobbyReducer: STATUS_CHANGED', { status })

      return {
        ...state,
        lobby: {
          ...state.lobby,
          status,
        },
      }
    }

    case 'UPDATE_LOBBY': {
      if (!state.lobby) {
        console.warn('📦 LobbyReducer: UPDATE_LOBBY - No lobby to update')
        return state
      }

      console.log('📦 LobbyReducer: UPDATE_LOBBY', action.payload)

      // IMMUTABILITÉ STRICTE: Spread pour fusionner
      return {
        ...state,
        lobby: {
          ...state.lobby,
          ...action.payload,
        },
      }
    }

    case 'RESET': {
      console.log('📦 LobbyReducer: RESET')
      return initialLobbyState
    }

    default:
      console.warn('📦 LobbyReducer: Unknown action type', action)
      return state
  }
}

/**
 * Action creators pour faciliter l'usage
 */
export const lobbyActions = {
  setLobby: (lobby: LobbyData): LobbyAction => ({
    type: 'SET_LOBBY',
    payload: lobby,
  }),

  setLoading: (loading: boolean): LobbyAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setError: (error: string | null): LobbyAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  playerJoined: (player: any, playerCount: number): LobbyAction => ({
    type: 'PLAYER_JOINED',
    payload: { player, playerCount },
  }),

  playerLeft: (playerUuid: string, playerCount: number): LobbyAction => ({
    type: 'PLAYER_LEFT',
    payload: { playerUuid, playerCount },
  }),

  statusChanged: (status: string): LobbyAction => ({
    type: 'STATUS_CHANGED',
    payload: { status },
  }),

  updateLobby: (updates: Partial<LobbyData>): LobbyAction => ({
    type: 'UPDATE_LOBBY',
    payload: updates,
  }),

  reset: (): LobbyAction => ({
    type: 'RESET',
  }),
}
