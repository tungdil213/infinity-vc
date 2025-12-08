import { DomainEvent, type EventMetadata } from '../core/event.js'

/**
 * Game event payloads
 */
export interface GameStartedPayload {
  gameId: string
  lobbyId: string
  playerIds: string[]
  gameType: string
  settings: Record<string, unknown>
}

export interface GameStateChangedPayload {
  gameId: string
  previousState: string
  newState: string
  trigger: string
}

export interface PlayerTurnStartedPayload {
  gameId: string
  playerId: string
  playerName: string
  turnNumber: number
  roundNumber: number
  availableActions: string[]
  timeLimit?: number
}

export interface PlayerActionPerformedPayload {
  gameId: string
  playerId: string
  actionType: string
  actionData: Record<string, unknown>
  result: Record<string, unknown>
  timestamp: Date
}

export interface PlayerEliminatedPayload {
  gameId: string
  playerId: string
  playerName: string
  eliminatedBy?: string
  reason: string
  remainingPlayers: number
}

export interface RoundEndedPayload {
  gameId: string
  roundNumber: number
  winnerId?: string
  winnerName?: string
  scores: Record<string, number>
}

export interface GameEndedPayload {
  gameId: string
  winnerId: string
  winnerName: string
  finalScores: Record<string, number>
  duration: number
  totalRounds: number
}

export interface GamePausedPayload {
  gameId: string
  pausedBy: string
  reason: string
}

export interface GameResumedPayload {
  gameId: string
  resumedBy: string
}

/**
 * Game event types enum
 */
export const GameEventTypes = {
  STARTED: 'game.started',
  STATE_CHANGED: 'game.state_changed',
  PLAYER_TURN_STARTED: 'game.player_turn_started',
  PLAYER_ACTION_PERFORMED: 'game.player_action_performed',
  PLAYER_ELIMINATED: 'game.player_eliminated',
  ROUND_ENDED: 'game.round_ended',
  ENDED: 'game.ended',
  PAUSED: 'game.paused',
  RESUMED: 'game.resumed',
} as const

export type GameEventType = (typeof GameEventTypes)[keyof typeof GameEventTypes]

/**
 * Game Started Event
 */
export class GameStartedEvent extends DomainEvent<GameStartedPayload> {
  readonly type = GameEventTypes.STARTED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: GameStartedPayload,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }

  get aggregateVersion(): number {
    return 1
  }
}

/**
 * Game State Changed Event
 */
export class GameStateChangedEvent extends DomainEvent<GameStateChangedPayload> {
  readonly type = GameEventTypes.STATE_CHANGED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: GameStateChangedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Player Turn Started Event
 */
export class PlayerTurnStartedEvent extends DomainEvent<PlayerTurnStartedPayload> {
  readonly type = GameEventTypes.PLAYER_TURN_STARTED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: PlayerTurnStartedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Player Action Performed Event
 */
export class PlayerActionPerformedEvent extends DomainEvent<PlayerActionPerformedPayload> {
  readonly type = GameEventTypes.PLAYER_ACTION_PERFORMED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: PlayerActionPerformedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Player Eliminated Event
 */
export class PlayerEliminatedEvent extends DomainEvent<PlayerEliminatedPayload> {
  readonly type = GameEventTypes.PLAYER_ELIMINATED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: PlayerEliminatedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Round Ended Event
 */
export class RoundEndedEvent extends DomainEvent<RoundEndedPayload> {
  readonly type = GameEventTypes.ROUND_ENDED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: RoundEndedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Game Ended Event
 */
export class GameEndedEvent extends DomainEvent<GameEndedPayload> {
  readonly type = GameEventTypes.ENDED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: GameEndedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Game Paused Event
 */
export class GamePausedEvent extends DomainEvent<GamePausedPayload> {
  readonly type = GameEventTypes.PAUSED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: GamePausedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Game Resumed Event
 */
export class GameResumedEvent extends DomainEvent<GameResumedPayload> {
  readonly type = GameEventTypes.RESUMED
  readonly aggregateType = 'Game'

  constructor(
    public readonly payload: GameResumedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.gameId
  }
}

/**
 * Union type of all game events
 */
export type GameEvent =
  | GameStartedEvent
  | GameStateChangedEvent
  | PlayerTurnStartedEvent
  | PlayerActionPerformedEvent
  | PlayerEliminatedEvent
  | RoundEndedEvent
  | GameEndedEvent
  | GamePausedEvent
  | GameResumedEvent

/**
 * Game event map for typed event bus
 */
export interface GameEventMap {
  [GameEventTypes.STARTED]: GameStartedEvent
  [GameEventTypes.STATE_CHANGED]: GameStateChangedEvent
  [GameEventTypes.PLAYER_TURN_STARTED]: PlayerTurnStartedEvent
  [GameEventTypes.PLAYER_ACTION_PERFORMED]: PlayerActionPerformedEvent
  [GameEventTypes.PLAYER_ELIMINATED]: PlayerEliminatedEvent
  [GameEventTypes.ROUND_ENDED]: RoundEndedEvent
  [GameEventTypes.ENDED]: GameEndedEvent
  [GameEventTypes.PAUSED]: GamePausedEvent
  [GameEventTypes.RESUMED]: GameResumedEvent
}
