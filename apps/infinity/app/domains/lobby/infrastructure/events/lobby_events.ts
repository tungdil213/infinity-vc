/**
 * Interface simple pour les données de joueur dans les événements
 */
export interface PlayerData {
  uuid: string
  nickName: string
  isReady?: boolean
  isOwner?: boolean
}

/**
 * Types d'événements pour le module lobby
 * Ces constantes sont utilisées comme eventName dans les DomainEvent
 */
export const LOBBY_EVENT_TYPES = {
  CREATED: 'lobby.created',
  UPDATED: 'lobby.updated',
  DELETED: 'lobby.deleted',
  PLAYER_JOINED: 'lobby.player.joined',
  PLAYER_LEFT: 'lobby.player.left',
  STATUS_CHANGED: 'lobby.status.changed',
  GAME_STARTED: 'lobby.game.started',
} as const

/**
 * Données pour l'événement de création de lobby
 */
export interface LobbyCreatedData {
  lobbyUuid: string
  name: string
  maxPlayers: number
  isPrivate: boolean
  createdBy: string
  creator: PlayerData
}

/**
 * Données pour l'événement de joueur qui rejoint
 */
export interface LobbyPlayerJoinedData {
  lobbyUuid: string
  player: PlayerData
  lobbyState: {
    currentPlayers: number
    maxPlayers: number
    canStart: boolean
    status: string
    players: PlayerData[]
  }
}

/**
 * Données pour l'événement de joueur qui quitte
 */
export interface LobbyPlayerLeftData {
  lobbyUuid: string
  player: PlayerData
  lobbyState: {
    currentPlayers: number
    maxPlayers: number
    canStart: boolean
    status: string
    players: PlayerData[]
  }
}

/**
 * Données pour l'événement de changement de statut
 */
export interface LobbyStatusChangedData {
  lobbyUuid: string
  oldStatus: string
  newStatus: string
}

/**
 * Données pour l'événement de suppression
 */
export interface LobbyDeletedData {
  lobbyUuid: string
  reason: string
}

/**
 * Données pour l'événement de démarrage de partie
 */
export interface LobbyGameStartedData {
  lobbyUuid: string
  gameUuid: string
  players: PlayerData[]
}
