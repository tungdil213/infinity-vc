/**
 * Game Events - Compatible with @tyfo.dev/events IEvent interface
 */
import type { IEvent } from '@tyfo.dev/events'
import Player from '../entities/player.js'

// Re-export event types from package for new code
export { GameEventTypes } from '@tyfo.dev/events/domain'

export enum GameEventType {
  GAME_STARTED = 'GameStarted',
  GAME_PAUSED = 'GamePaused',
  GAME_RESUMED = 'GameResumed',
  GAME_FINISHED = 'GameFinished',
  TURN_CHANGED = 'TurnChanged',
  ROUND_CHANGED = 'RoundChanged',
  PLAYER_ACTION = 'PlayerAction',
  PLAYER_ELIMINATED = 'PlayerEliminated',
  GAME_STATE_UPDATED = 'GameStateUpdated',
}

/**
 * Base class for game events with IEvent compatibility
 */
abstract class BaseGameEvent<T = unknown> implements IEvent<T> {
  readonly id: string = crypto.randomUUID()
  readonly timestamp: Date

  abstract readonly type: string
  abstract readonly payload: T

  constructor(timestamp?: Date) {
    this.timestamp = timestamp ?? new Date()
  }

  // Backward compatibility
  get eventType(): string {
    return this.type
  }
}

export interface GameStartedData {
  gameUuid: string
  players: Player[]
  startedAt: Date
}

export class GameStartedEvent extends BaseGameEvent<GameStartedData> {
  readonly type = GameEventType.GAME_STARTED

  constructor(
    public readonly gameUuid: string,
    public readonly players: Player[],
    public readonly startedAt: Date,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): GameStartedData {
    return {
      gameUuid: this.gameUuid,
      players: this.players,
      startedAt: this.startedAt,
    }
  }
}

export interface GamePausedData {
  gameUuid: string
  pausedBy: string
}

export class GamePausedEvent extends BaseGameEvent<GamePausedData> {
  readonly type = GameEventType.GAME_PAUSED

  constructor(
    public readonly gameUuid: string,
    public readonly pausedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): GamePausedData {
    return {
      gameUuid: this.gameUuid,
      pausedBy: this.pausedBy,
    }
  }
}

export interface GameResumedData {
  gameUuid: string
  resumedBy: string
}

export class GameResumedEvent extends BaseGameEvent<GameResumedData> {
  readonly type = GameEventType.GAME_RESUMED

  constructor(
    public readonly gameUuid: string,
    public readonly resumedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): GameResumedData {
    return {
      gameUuid: this.gameUuid,
      resumedBy: this.resumedBy,
    }
  }
}

export interface GameFinishedData {
  gameUuid: string
  winner: Player | null
  finalScores: Record<string, number>
  duration: number
}

export class GameFinishedEvent extends BaseGameEvent<GameFinishedData> {
  readonly type = GameEventType.GAME_FINISHED

  constructor(
    public readonly gameUuid: string,
    public readonly winner: Player | null,
    public readonly finalScores: Record<string, number>,
    public readonly duration: number,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): GameFinishedData {
    return {
      gameUuid: this.gameUuid,
      winner: this.winner,
      finalScores: this.finalScores,
      duration: this.duration,
    }
  }
}

export interface TurnChangedData {
  gameUuid: string
  previousPlayer: Player | null
  currentPlayer: Player
  round: number
}

export class TurnChangedEvent extends BaseGameEvent<TurnChangedData> {
  readonly type = GameEventType.TURN_CHANGED

  constructor(
    public readonly gameUuid: string,
    public readonly previousPlayer: Player | null,
    public readonly currentPlayer: Player,
    public readonly round: number,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): TurnChangedData {
    return {
      gameUuid: this.gameUuid,
      previousPlayer: this.previousPlayer,
      currentPlayer: this.currentPlayer,
      round: this.round,
    }
  }
}

export interface RoundChangedData {
  gameUuid: string
  previousRound: number
  currentRound: number
  roundScores: Record<string, number>
}

export class RoundChangedEvent extends BaseGameEvent<RoundChangedData> {
  readonly type = GameEventType.ROUND_CHANGED

  constructor(
    public readonly gameUuid: string,
    public readonly previousRound: number,
    public readonly currentRound: number,
    public readonly roundScores: Record<string, number>,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): RoundChangedData {
    return {
      gameUuid: this.gameUuid,
      previousRound: this.previousRound,
      currentRound: this.currentRound,
      roundScores: this.roundScores,
    }
  }
}

export interface PlayerActionData {
  gameUuid: string
  player: Player
  action: string
  actionData: unknown
  gameState: unknown
}

export class PlayerActionEvent extends BaseGameEvent<PlayerActionData> {
  readonly type = GameEventType.PLAYER_ACTION

  constructor(
    public readonly gameUuid: string,
    public readonly player: Player,
    public readonly action: string,
    public readonly actionData: unknown,
    public readonly gameState: unknown,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): PlayerActionData {
    return {
      gameUuid: this.gameUuid,
      player: this.player,
      action: this.action,
      actionData: this.actionData,
      gameState: this.gameState,
    }
  }
}

export interface PlayerEliminatedData {
  gameUuid: string
  eliminatedPlayer: Player
  eliminatedBy: Player | null
  reason: string
  remainingPlayers: Player[]
}

export class PlayerEliminatedEvent extends BaseGameEvent<PlayerEliminatedData> {
  readonly type = GameEventType.PLAYER_ELIMINATED

  constructor(
    public readonly gameUuid: string,
    public readonly eliminatedPlayer: Player,
    public readonly eliminatedBy: Player | null,
    public readonly reason: string,
    public readonly remainingPlayers: Player[],
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): PlayerEliminatedData {
    return {
      gameUuid: this.gameUuid,
      eliminatedPlayer: this.eliminatedPlayer,
      eliminatedBy: this.eliminatedBy,
      reason: this.reason,
      remainingPlayers: this.remainingPlayers,
    }
  }
}

export interface GameStateUpdatedData {
  gameUuid: string
  gameState: unknown
  updatedBy: string
}

export class GameStateUpdatedEvent extends BaseGameEvent<GameStateUpdatedData> {
  readonly type = GameEventType.GAME_STATE_UPDATED

  constructor(
    public readonly gameUuid: string,
    public readonly gameState: unknown,
    public readonly updatedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }

  get payload(): GameStateUpdatedData {
    return {
      gameUuid: this.gameUuid,
      gameState: this.gameState,
      updatedBy: this.updatedBy,
    }
  }
}
