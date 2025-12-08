import { DomainEvent, type EventMetadata } from '../core/event.js'

/**
 * Lobby event payloads
 */
export interface LobbyCreatedPayload {
  lobbyId: string
  name: string
  creatorId: string
  maxPlayers: number
  isPrivate: boolean
}

export interface PlayerJoinedLobbyPayload {
  lobbyId: string
  playerId: string
  playerName: string
  currentPlayerCount: number
  maxPlayers: number
}

export interface PlayerLeftLobbyPayload {
  lobbyId: string
  playerId: string
  playerName: string
  reason: 'left' | 'kicked' | 'disconnected'
  currentPlayerCount: number
}

export interface LobbyStatusChangedPayload {
  lobbyId: string
  previousStatus: string
  newStatus: string
  currentPlayerCount: number
}

export interface LobbySettingsUpdatedPayload {
  lobbyId: string
  changes: Record<string, { from: unknown; to: unknown }>
}

export interface LobbyOwnerChangedPayload {
  lobbyId: string
  previousOwnerId: string
  newOwnerId: string
  newOwnerName: string
}

export interface LobbyClosedPayload {
  lobbyId: string
  reason: 'started' | 'empty' | 'timeout' | 'manual'
}

/**
 * Lobby event types enum
 */
export const LobbyEventTypes = {
  CREATED: 'lobby.created',
  PLAYER_JOINED: 'lobby.player_joined',
  PLAYER_LEFT: 'lobby.player_left',
  STATUS_CHANGED: 'lobby.status_changed',
  SETTINGS_UPDATED: 'lobby.settings_updated',
  OWNER_CHANGED: 'lobby.owner_changed',
  CLOSED: 'lobby.closed',
} as const

export type LobbyEventType = (typeof LobbyEventTypes)[keyof typeof LobbyEventTypes]

/**
 * Lobby Created Event
 */
export class LobbyCreatedEvent extends DomainEvent<LobbyCreatedPayload> {
  readonly type = LobbyEventTypes.CREATED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: LobbyCreatedPayload,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }

  get aggregateVersion(): number {
    return 1
  }
}

/**
 * Player Joined Lobby Event
 */
export class PlayerJoinedLobbyEvent extends DomainEvent<PlayerJoinedLobbyPayload> {
  readonly type = LobbyEventTypes.PLAYER_JOINED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: PlayerJoinedLobbyPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Player Left Lobby Event
 */
export class PlayerLeftLobbyEvent extends DomainEvent<PlayerLeftLobbyPayload> {
  readonly type = LobbyEventTypes.PLAYER_LEFT
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: PlayerLeftLobbyPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Lobby Status Changed Event
 */
export class LobbyStatusChangedEvent extends DomainEvent<LobbyStatusChangedPayload> {
  readonly type = LobbyEventTypes.STATUS_CHANGED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: LobbyStatusChangedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Lobby Settings Updated Event
 */
export class LobbySettingsUpdatedEvent extends DomainEvent<LobbySettingsUpdatedPayload> {
  readonly type = LobbyEventTypes.SETTINGS_UPDATED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: LobbySettingsUpdatedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Lobby Owner Changed Event
 */
export class LobbyOwnerChangedEvent extends DomainEvent<LobbyOwnerChangedPayload> {
  readonly type = LobbyEventTypes.OWNER_CHANGED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: LobbyOwnerChangedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Lobby Closed Event
 */
export class LobbyClosedEvent extends DomainEvent<LobbyClosedPayload> {
  readonly type = LobbyEventTypes.CLOSED
  readonly aggregateType = 'Lobby'

  constructor(
    public readonly payload: LobbyClosedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.lobbyId
  }
}

/**
 * Union type of all lobby events
 */
export type LobbyEvent =
  | LobbyCreatedEvent
  | PlayerJoinedLobbyEvent
  | PlayerLeftLobbyEvent
  | LobbyStatusChangedEvent
  | LobbySettingsUpdatedEvent
  | LobbyOwnerChangedEvent
  | LobbyClosedEvent

/**
 * Lobby event map for typed event bus
 */
export interface LobbyEventMap {
  [LobbyEventTypes.CREATED]: LobbyCreatedEvent
  [LobbyEventTypes.PLAYER_JOINED]: PlayerJoinedLobbyEvent
  [LobbyEventTypes.PLAYER_LEFT]: PlayerLeftLobbyEvent
  [LobbyEventTypes.STATUS_CHANGED]: LobbyStatusChangedEvent
  [LobbyEventTypes.SETTINGS_UPDATED]: LobbySettingsUpdatedEvent
  [LobbyEventTypes.OWNER_CHANGED]: LobbyOwnerChangedEvent
  [LobbyEventTypes.CLOSED]: LobbyClosedEvent
}
