/**
 * Lobby Events - Compatible with @tyfo.dev/events IEvent interface
 */
import type { IEvent } from '@tyfo.dev/events'
import type { PlayerInterface } from '../interfaces/player_interface.js'

// Re-export event types from package for new code
export {
  LobbyEventTypes,
  type LobbyCreatedPayload,
  type PlayerJoinedLobbyPayload,
  type PlayerLeftLobbyPayload,
  type LobbyStatusChangedPayload,
} from '@tyfo.dev/events/domain'

export enum LobbyEvent {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  READY_SET = 'READY_SET',
  GAME_STARTED = 'GAME_STARTED',
  LOBBY_CLOSED = 'LOBBY_CLOSED',
}

/**
 * Base class for lobby events with IEvent compatibility
 */
abstract class BaseLobbyEvent<T = unknown> implements IEvent<T> {
  readonly id: string = crypto.randomUUID()
  readonly timestamp: Date = new Date()
  abstract readonly type: string
  abstract readonly payload: T

  // Backward compatibility
  get eventType(): string {
    return this.type
  }
}

export interface LobbyCreatedData {
  lobbyUuid: string
  lobbyName: string
  createdBy: string
  maxPlayers: number
}

export class LobbyCreatedEvent extends BaseLobbyEvent<LobbyCreatedData> {
  readonly type = 'LobbyCreated'

  constructor(
    public readonly lobbyUuid: string,
    public readonly lobbyName: string,
    public readonly createdBy: string,
    public readonly maxPlayers: number
  ) {
    super()
  }

  get payload(): LobbyCreatedData {
    return {
      lobbyUuid: this.lobbyUuid,
      lobbyName: this.lobbyName,
      createdBy: this.createdBy,
      maxPlayers: this.maxPlayers,
    }
  }

  // Alias for eventType backward compat
  get eventType(): string {
    return this.type
  }
}

export interface PlayerJoinedData {
  lobbyUuid: string
  player: PlayerInterface
  playerCount: number
  lobbyStatus: string
}

export class PlayerJoinedLobbyEvent extends BaseLobbyEvent<PlayerJoinedData> {
  readonly type = 'PlayerJoinedLobby'

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string
  ) {
    super()
  }

  get payload(): PlayerJoinedData {
    return {
      lobbyUuid: this.lobbyUuid,
      player: this.player,
      playerCount: this.playerCount,
      lobbyStatus: this.lobbyStatus,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface PlayerLeftData {
  lobbyUuid: string
  player: PlayerInterface
  playerCount: number
  lobbyStatus: string
}

export class PlayerLeftLobbyEvent extends BaseLobbyEvent<PlayerLeftData> {
  readonly type = 'PlayerLeftLobby'

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly playerCount: number,
    public readonly lobbyStatus: string
  ) {
    super()
  }

  get payload(): PlayerLeftData {
    return {
      lobbyUuid: this.lobbyUuid,
      player: this.player,
      playerCount: this.playerCount,
      lobbyStatus: this.lobbyStatus,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface LobbyUpdatedData {
  lobbyUuid: string
  lobbyName: string
  playerCount: number
  maxPlayers: number
  lobbyStatus: string
  players: PlayerInterface[]
}

export class LobbyUpdatedEvent extends BaseLobbyEvent<LobbyUpdatedData> {
  readonly type = 'LobbyUpdated'

  constructor(
    public readonly lobbyUuid: string,
    public readonly lobbyName: string,
    public readonly playerCount: number,
    public readonly maxPlayers: number,
    public readonly lobbyStatus: string,
    public readonly players: PlayerInterface[]
  ) {
    super()
  }

  get payload(): LobbyUpdatedData {
    return {
      lobbyUuid: this.lobbyUuid,
      lobbyName: this.lobbyName,
      playerCount: this.playerCount,
      maxPlayers: this.maxPlayers,
      lobbyStatus: this.lobbyStatus,
      players: this.players,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface LobbyStatusChangedData {
  lobbyUuid: string
  oldStatus: string
  newStatus: string
}

export class LobbyStatusChangedEvent extends BaseLobbyEvent<LobbyStatusChangedData> {
  readonly type = 'LobbyStatusChanged'

  constructor(
    public readonly lobbyUuid: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    super()
  }

  get payload(): LobbyStatusChangedData {
    return {
      lobbyUuid: this.lobbyUuid,
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface LobbyDeletedData {
  lobbyUuid: string
  reason: string
}

export class LobbyDeletedEvent extends BaseLobbyEvent<LobbyDeletedData> {
  readonly type = 'LobbyDeleted'

  constructor(
    public readonly lobbyUuid: string,
    public readonly reason: string
  ) {
    super()
  }

  get payload(): LobbyDeletedData {
    return {
      lobbyUuid: this.lobbyUuid,
      reason: this.reason,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface PlayerKickedData {
  lobbyUuid: string
  kickedPlayer: PlayerInterface
  kickedBy: PlayerInterface
  reason: string
  remainingPlayers: PlayerInterface[]
}

export class PlayerKickedEvent extends BaseLobbyEvent<PlayerKickedData> {
  readonly type = 'PlayerKicked'

  constructor(
    public readonly lobbyUuid: string,
    public readonly kickedPlayer: PlayerInterface,
    public readonly kickedBy: PlayerInterface,
    public readonly reason: string,
    public readonly remainingPlayers: PlayerInterface[]
  ) {
    super()
  }

  get payload(): PlayerKickedData {
    return {
      lobbyUuid: this.lobbyUuid,
      kickedPlayer: this.kickedPlayer,
      kickedBy: this.kickedBy,
      reason: this.reason,
      remainingPlayers: this.remainingPlayers,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface PlayerReadyChangedData {
  lobbyUuid: string
  player: PlayerInterface
  isReady: boolean
  allPlayersReady: boolean
  canStartGame: boolean
}

export class PlayerReadyChangedEvent extends BaseLobbyEvent<PlayerReadyChangedData> {
  readonly type = 'PlayerReadyChanged'

  constructor(
    public readonly lobbyUuid: string,
    public readonly player: PlayerInterface,
    public readonly isReady: boolean,
    public readonly allPlayersReady: boolean,
    public readonly canStartGame: boolean
  ) {
    super()
  }

  get payload(): PlayerReadyChangedData {
    return {
      lobbyUuid: this.lobbyUuid,
      player: this.player,
      isReady: this.isReady,
      allPlayersReady: this.allPlayersReady,
      canStartGame: this.canStartGame,
    }
  }

  get eventType(): string {
    return this.type
  }
}

export interface GameStartedData {
  gameUuid: string
  lobbyUuid: string
  players: PlayerInterface[]
}

export class GameStartedEvent extends BaseLobbyEvent<GameStartedData> {
  readonly type = 'GameStarted'

  constructor(
    public readonly gameUuid: string,
    public readonly lobbyUuid: string,
    public readonly players: PlayerInterface[]
  ) {
    super()
  }

  get payload(): GameStartedData {
    return {
      gameUuid: this.gameUuid,
      lobbyUuid: this.lobbyUuid,
      players: this.players,
    }
  }

  get eventType(): string {
    return this.type
  }
}
