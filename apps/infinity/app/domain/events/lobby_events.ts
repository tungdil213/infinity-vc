import { BaseDomainEvent } from './base/base_domain_event.js'
import { PlayerInterface } from '../interfaces/player_interface.js'

/**
 * Enum pour les événements de lobby (utilisé par la state machine)
 */
export enum LobbyEvent {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  GAME_STARTED = 'GAME_STARTED',
  LOBBY_CREATED = 'LOBBY_CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  LOBBY_DELETED = 'LOBBY_DELETED',
}

/**
 * Interface de base pour les événements de domaine
 */
export interface DomainEvent {
  eventType: string
  timestamp: Date
}

/**
 * Événement quand un joueur rejoint un lobby
 */
export class PlayerJoinedLobbyEvent extends BaseDomainEvent {
  readonly eventType = 'PlayerJoinedLobby'

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

/**
 * Événement quand un joueur quitte un lobby
 */
export class PlayerLeftLobbyEvent extends BaseDomainEvent {
  readonly eventType = 'PlayerLeftLobby'

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

/**
 * Événement quand une partie démarre
 */
export class GameStartedEvent extends BaseDomainEvent {
  readonly eventType = 'GameStarted'

  constructor(
    public readonly gameUuid: string,
    public readonly lobbyUuid: string,
    public readonly players: PlayerInterface[],
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

/**
 * Événement quand un lobby est créé
 */
export class LobbyCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'LobbyCreated'

  constructor(
    public readonly lobbyUuid: string,
    public readonly name: string,
    public readonly creator: PlayerInterface,
    public readonly maxPlayers: number,
    public readonly isPrivate: boolean,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

/**
 * Événement quand un lobby est mis à jour
 */
export class LobbyUpdatedEvent extends BaseDomainEvent {
  readonly eventType = 'LobbyUpdated'

  constructor(
    public readonly lobbyUuid: string,
    public readonly changes: Record<string, any>,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

/**
 * Événement quand un lobby est supprimé
 */
export class LobbyDeletedEvent extends BaseDomainEvent {
  readonly eventType = 'LobbyDeleted'

  constructor(
    public readonly lobbyUuid: string,
    public readonly reason: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}
