import type { PlayerInterface } from '../interfaces/player_interface.js'
import { DomainEvent } from './domain_event.js'

export enum LobbyEvent {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  READY_SET = 'READY_SET',
  GAME_STARTED = 'GAME_STARTED',
  LOBBY_CLOSED = 'LOBBY_CLOSED',
}

export class LobbyCreatedEvent implements DomainEvent {
  readonly eventType: string = 'LobbyCreated'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly lobbyName: string,
    public readonly createdBy: string,
    public readonly maxPlayers: number
  ) {}
}

export class PlayerJoinedLobbyEvent implements DomainEvent {
  readonly eventType: string = 'PlayerJoinedLobby'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string
  ) {}
}

export class PlayerLeftLobbyEvent implements DomainEvent {
  readonly eventType: string = 'PlayerLeftLobby'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string
  ) {}
}

export class LobbyUpdatedEvent implements DomainEvent {
  readonly eventType: string = 'LobbyUpdated'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly lobbyName: string,
    public readonly playerCount: number,
    public readonly maxPlayers: number,
    public readonly lobbyStatus: string,
    public readonly players: PlayerInterface[]
  ) {}
}

export class LobbyStatusChangedEvent implements DomainEvent {
  readonly eventType: string = 'LobbyStatusChanged'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {}
}

export class LobbyDeletedEvent implements DomainEvent {
  readonly eventType: string = 'LobbyDeleted'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly reason: string
  ) {}
}

export class PlayerKickedEvent implements DomainEvent {
  readonly eventType: string = 'PlayerKicked'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly kickedPlayer: PlayerInterface,
    public readonly kickedBy: PlayerInterface,
    public readonly reason: string,
    public readonly remainingPlayers: PlayerInterface[]
  ) {}
}

export class PlayerReadyChangedEvent implements DomainEvent {
  readonly eventType: string = 'PlayerReadyChanged'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly isReady: boolean,
    public readonly allPlayersReady: boolean,
    public readonly canStartGame: boolean
  ) {}
}

export class GameStartedEvent implements DomainEvent {
  readonly eventType: string = 'GameStarted'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly gameUuid: string,
    public readonly lobbyUuid: string,
    public readonly players: PlayerInterface[]
  ) {}
}
