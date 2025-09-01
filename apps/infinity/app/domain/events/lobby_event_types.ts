/**
 * Types d'événements pour les lobbies
 */
export enum LobbyEventType {
  LOBBY_CREATED = 'lobby.created',
  PLAYER_JOINED = 'lobby.player.joined',
  PLAYER_LEFT = 'lobby.player.left',
  STATUS_CHANGED = 'lobby.status.changed',
  GAME_STARTED = 'lobby.game.started',
  LOBBY_DELETED = 'lobby.deleted',
}

/**
 * Interface de base pour tous les événements de lobby
 */
export interface BaseLobbyEvent {
  type: LobbyEventType
  lobbyUuid: string
  timestamp: Date
  lobby: any // LobbyDto ou représentation du lobby
}

/**
 * Événement quand un joueur rejoint un lobby
 */
export interface PlayerJoinedEvent extends BaseLobbyEvent {
  type: LobbyEventType.PLAYER_JOINED
  player: {
    uuid: string
    nickName: string
  }
}

/**
 * Événement quand un joueur quitte un lobby
 */
export interface PlayerLeftEvent extends BaseLobbyEvent {
  type: LobbyEventType.PLAYER_LEFT
  player: {
    uuid: string
    nickName: string
  }
}

/**
 * Événement quand le statut d'un lobby change
 */
export interface StatusChangedEvent extends BaseLobbyEvent {
  type: LobbyEventType.STATUS_CHANGED
  oldStatus: string
  newStatus: string
}

/**
 * Événement quand une partie commence
 */
export interface GameStartedEvent extends BaseLobbyEvent {
  type: LobbyEventType.GAME_STARTED
  gameUuid: string
}

/**
 * Événement quand un lobby est créé
 */
export interface LobbyCreatedEvent extends BaseLobbyEvent {
  type: LobbyEventType.LOBBY_CREATED
}

/**
 * Événement quand un lobby est supprimé
 */
export interface LobbyDeletedEvent extends BaseLobbyEvent {
  type: LobbyEventType.LOBBY_DELETED
}

/**
 * Union type pour tous les événements de lobby
 */
export type LobbyEvent = 
  | LobbyCreatedEvent
  | PlayerJoinedEvent 
  | PlayerLeftEvent 
  | StatusChangedEvent 
  | GameStartedEvent 
  | LobbyDeletedEvent

/**
 * Type pour les listeners d'événements
 */
export type LobbyEventListener = (event: LobbyEvent) => void

/**
 * Type pour la fonction de désabonnement
 */
export type UnsubscribeFunction = () => void
