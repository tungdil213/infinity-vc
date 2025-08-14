import { BaseDomainEvent } from './domain_event.js'
import { Player } from '../value_objects/player.js'

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

export class GameStartedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.GAME_STARTED

  constructor(
    public readonly gameUuid: string,
    public readonly players: Player[],
    public readonly startedAt: Date,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class GamePausedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.GAME_PAUSED

  constructor(
    public readonly gameUuid: string,
    public readonly pausedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class GameResumedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.GAME_RESUMED

  constructor(
    public readonly gameUuid: string,
    public readonly resumedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class GameFinishedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.GAME_FINISHED

  constructor(
    public readonly gameUuid: string,
    public readonly winner: Player | null,
    public readonly finalScores: Record<string, number>,
    public readonly duration: number,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class TurnChangedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.TURN_CHANGED

  constructor(
    public readonly gameUuid: string,
    public readonly previousPlayer: Player | null,
    public readonly currentPlayer: Player,
    public readonly round: number,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class RoundChangedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.ROUND_CHANGED

  constructor(
    public readonly gameUuid: string,
    public readonly previousRound: number,
    public readonly currentRound: number,
    public readonly roundScores: Record<string, number>,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class PlayerActionEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.PLAYER_ACTION

  constructor(
    public readonly gameUuid: string,
    public readonly player: Player,
    public readonly action: string,
    public readonly actionData: any,
    public readonly gameState: any,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}

export class PlayerEliminatedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.PLAYER_ELIMINATED

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
}

export class GameStateUpdatedEvent extends BaseDomainEvent {
  readonly eventType = GameEventType.GAME_STATE_UPDATED

  constructor(
    public readonly gameUuid: string,
    public readonly gameState: any,
    public readonly updatedBy: string,
    timestamp?: Date
  ) {
    super(timestamp)
  }
}
