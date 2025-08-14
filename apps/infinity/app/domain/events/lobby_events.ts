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

export class GameStartedEvent implements DomainEvent {
  readonly eventType: string = 'GameStarted'
  readonly timestamp: Date = new Date()

  constructor(
    public readonly lobbyUuid: string,
    public readonly gameUuid: string,
    public readonly players: PlayerInterface[]
  ) {}
}
