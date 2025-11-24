/**
 * Types et interfaces pour le système de lobbies temps réel
 * Respecte les patterns Board Game Arena documentés
 */

// États de lobby standardisés Board Game Arena
export const LOBBY_STATUS = {
  WAITING: 'WAITING', // En attente de plus de joueurs (1 joueur)
  READY: 'READY', // Prêt à commencer (2-3 joueurs)
  FULL: 'FULL', // Lobby complet (4 joueurs)
  STARTING: 'STARTING', // Démarrage en cours
  IN_GAME: 'IN_GAME', // Partie en cours
  PAUSED: 'PAUSED', // Partie en pause
  FINISHED: 'FINISHED', // Partie terminée
  CANCELLED: 'CANCELLED', // Partie annulée
} as const

export type LobbyStatus = (typeof LOBBY_STATUS)[keyof typeof LOBBY_STATUS]

// Interface joueur standardisée
export interface Player {
  uuid: string
  nickName: string
  fullName?: string
  isOnline?: boolean
  joinedAt?: string
}

// Interface lobby complète
export interface Lobby {
  uuid: string
  name: string
  status: LobbyStatus
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Player[]
  createdAt: string
  updatedAt?: string
  gameUuid?: string
  metadata?: Record<string, any>
}

// États des hooks
export interface LobbyDetailState {
  lobby: Lobby | null
  loading: boolean
  error: string | null
}

export interface LobbyListState {
  lobbies: Lobby[]
  loading: boolean
  error: string | null
  total: number
}

// Événements Transmit standardisés
export interface LobbyTransmitEvent {
  type:
    | 'lobby.created'
    | 'lobby.updated'
    | 'lobby.deleted'
    | 'lobby.player.joined'
    | 'lobby.player.left'
    | 'lobby.status.changed'
    | 'lobby.game.started'
    | 'lobby.closed'
    | 'lobby.owner.changed'
  data: {
    lobby?: Lobby
    lobbyUuid?: string
    player?: Player
    playerUuid?: string
    oldStatus?: LobbyStatus
    newStatus?: LobbyStatus
    gameUuid?: string
    [key: string]: any
  }
  timestamp: string
  channel: string
}

// Permissions utilisateur
export interface LobbyPermissions {
  canJoin: boolean
  canLeave: boolean
  canStart: boolean
  canKick: boolean
  canInvite: boolean
  canSpectate: boolean
  isCreator: boolean
  isPlayer: boolean
}

// Actions utilisateur
export interface LobbyActions {
  joinLobby: (userUuid: string) => Promise<void>
  leaveLobby: (userUuid: string) => Promise<void>
  startGame: (userUuid: string) => Promise<{ gameUuid: string }>
  kickPlayer?: (playerUuid: string) => Promise<void>
  invitePlayer?: (playerUuid: string) => Promise<void>
}

// Configuration des hooks
export interface LobbyHookConfig {
  enableRealTime: boolean
  timeoutMs: number
  retryAttempts: number
  fallbackToPolling: boolean
}

// Résultats d'opérations
export interface LobbyOperationResult {
  success: boolean
  error?: string
  data?: any
}

// Callbacks pour les services
export type LobbyDetailCallback = (state: LobbyDetailState) => void
export type LobbyListCallback = (state: LobbyListState) => void
export type LobbyEventCallback = (event: LobbyTransmitEvent) => void

// Type conversion utilities
export function convertLobbyDataToLobby(lobbyData: any): Lobby {
  return {
    ...lobbyData,
    status: isValidLobbyStatus(lobbyData.status) ? lobbyData.status : LOBBY_STATUS.WAITING,
    players: lobbyData.players || [],
  }
}

export function convertLobbyListState(serviceState: any): LobbyListState {
  return {
    ...serviceState,
    lobbies: serviceState.lobbies.map(convertLobbyDataToLobby),
  }
}

// Utility functions
export function isValidLobbyStatus(status: string): status is LobbyStatus {
  return Object.values(LOBBY_STATUS).includes(status as LobbyStatus)
}

export function validateLobbyTransition(from: LobbyStatus, to: LobbyStatus): boolean {
  const validTransitions: Record<LobbyStatus, LobbyStatus[]> = {
    [LOBBY_STATUS.WAITING]: [LOBBY_STATUS.READY, LOBBY_STATUS.FULL, LOBBY_STATUS.CANCELLED],
    [LOBBY_STATUS.READY]: [LOBBY_STATUS.STARTING, LOBBY_STATUS.WAITING, LOBBY_STATUS.CANCELLED],
    [LOBBY_STATUS.FULL]: [LOBBY_STATUS.STARTING, LOBBY_STATUS.READY, LOBBY_STATUS.CANCELLED],
    [LOBBY_STATUS.STARTING]: [LOBBY_STATUS.IN_GAME, LOBBY_STATUS.CANCELLED],
    [LOBBY_STATUS.IN_GAME]: [LOBBY_STATUS.PAUSED, LOBBY_STATUS.FINISHED],
    [LOBBY_STATUS.PAUSED]: [LOBBY_STATUS.IN_GAME, LOBBY_STATUS.CANCELLED],
    [LOBBY_STATUS.FINISHED]: [],
    [LOBBY_STATUS.CANCELLED]: [],
  }

  return validTransitions[from]?.includes(to) ?? false
}

export function getLobbyPermissions(
  lobby: Lobby | null,
  currentUser: { uuid: string }
): LobbyPermissions {
  if (!lobby) {
    return {
      canJoin: false,
      canLeave: false,
      canStart: false,
      canKick: false,
      canInvite: false,
      canSpectate: false,
      isCreator: false,
      isPlayer: false,
    }
  }

  const isCreator = lobby.createdBy === currentUser.uuid
  const isPlayer = lobby.players.some((p) => p.uuid === currentUser.uuid)
  const canJoin =
    !isPlayer &&
    lobby.hasAvailableSlots &&
    (lobby.status === LOBBY_STATUS.WAITING || lobby.status === LOBBY_STATUS.READY)

  return {
    canJoin,
    canLeave: isPlayer,
    canStart: isCreator && lobby.canStart,
    canKick: isCreator && lobby.currentPlayers > 1,
    canInvite: isCreator && lobby.hasAvailableSlots,
    canSpectate: !isPlayer,
    isCreator,
    isPlayer,
  }
}
