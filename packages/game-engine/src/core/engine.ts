import type { Result } from '@tyfo.dev/events'
import type {
  IGameState,
  IAction,
  IActionResult,
  IPlayer,
  IGameConfig,
  IPlayerView,
  IGameMetadata,
} from './types.js'

/**
 * Game engine interface - the main abstraction for any game
 */
export interface IGameEngine<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> {
  /**
   * Get game metadata
   */
  readonly metadata: IGameMetadata

  /**
   * Initialize a new game with players and config
   */
  initialize(players: IPlayer[], config?: Partial<IGameConfig>): Result<TState, Error>

  /**
   * Validate if an action is legal in the current state
   */
  validateAction(state: TState, action: TAction): Result<void, Error>

  /**
   * Execute an action and return the new state
   */
  executeAction(state: TState, action: TAction): Result<IActionResult<TState>, Error>

  /**
   * Get available actions for a player
   */
  getAvailableActions(state: TState, playerId: string): string[]

  /**
   * Get player view (what they can see)
   */
  getPlayerView(state: TState, playerId: string): IPlayerView<TState>

  /**
   * Check if the game is over
   */
  isGameOver(state: TState): boolean

  /**
   * Get the winner(s) if game is over
   */
  getWinners(state: TState): IPlayer[]

  /**
   * Serialize state for storage/transmission
   */
  serializeState(state: TState): string

  /**
   * Deserialize state from storage
   */
  deserializeState(data: string): Result<TState, Error>
}

/**
 * Abstract base class for game engines
 */
export abstract class BaseGameEngine<
  TState extends IGameState = IGameState,
  TAction extends IAction = IAction,
> implements IGameEngine<TState, TAction>
{
  abstract readonly metadata: IGameMetadata

  abstract initialize(players: IPlayer[], config?: Partial<IGameConfig>): Result<TState, Error>

  validateAction(state: TState, action: TAction): Result<void, Error> {
    // Check basic validations
    if (state.isFinished) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error('Game is already finished'),
      } as Result<void, Error>
    }

    if (state.currentPlayerId !== action.playerId) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error('Not your turn'),
      } as Result<void, Error>
    }

    const availableActions = this.getAvailableActions(state, action.playerId)
    if (!availableActions.includes(action.type)) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error(`Action ${action.type} is not available`),
      } as Result<void, Error>
    }

    // Delegate to specific validation
    return this.validateActionSpecific(state, action)
  }

  /**
   * Game-specific action validation
   */
  protected abstract validateActionSpecific(state: TState, action: TAction): Result<void, Error>

  abstract executeAction(state: TState, action: TAction): Result<IActionResult<TState>, Error>

  abstract getAvailableActions(state: TState, playerId: string): string[]

  getPlayerView(state: TState, playerId: string): IPlayerView<TState> {
    const player = state.players.find((p) => p.id === playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found in game`)
    }

    return {
      playerId,
      state: this.filterStateForPlayer(state, playerId),
      availableActions: this.getAvailableActions(state, playerId),
      isMyTurn: state.currentPlayerId === playerId,
    }
  }

  /**
   * Filter state to show only what the player can see
   */
  protected abstract filterStateForPlayer(state: TState, playerId: string): Partial<TState>

  isGameOver(state: TState): boolean {
    return state.isFinished
  }

  getWinners(state: TState): IPlayer[] {
    if (!state.isFinished || !state.winnerId) {
      return []
    }
    return state.players.filter((p) => p.id === state.winnerId)
  }

  serializeState(state: TState): string {
    return JSON.stringify(state)
  }

  deserializeState(data: string): Result<TState, Error> {
    try {
      const state = JSON.parse(data) as TState
      return {
        isSuccess: true,
        isFailure: false,
        value: state,
      } as Result<TState, Error>
    } catch (error) {
      return {
        isSuccess: false,
        isFailure: true,
        error: error as Error,
      } as Result<TState, Error>
    }
  }
}

/**
 * Game engine factory
 */
export interface IGameEngineFactory {
  /**
   * Create a game engine by type
   */
  create(gameType: string): IGameEngine | null

  /**
   * Register a game engine
   */
  register(gameType: string, factory: () => IGameEngine): void

  /**
   * Get all registered game types
   */
  getGameTypes(): string[]

  /**
   * Get metadata for all games
   */
  getAllMetadata(): IGameMetadata[]
}

/**
 * Default game engine factory implementation
 */
export class GameEngineFactory implements IGameEngineFactory {
  private engines: Map<string, () => IGameEngine> = new Map()

  create(gameType: string): IGameEngine | null {
    const factory = this.engines.get(gameType)
    return factory ? factory() : null
  }

  register(gameType: string, factory: () => IGameEngine): void {
    this.engines.set(gameType, factory)
  }

  getGameTypes(): string[] {
    return Array.from(this.engines.keys())
  }

  getAllMetadata(): IGameMetadata[] {
    return Array.from(this.engines.values()).map((factory) => factory().metadata)
  }
}

/**
 * Create a new game engine factory
 */
export function createGameEngineFactory(): IGameEngineFactory {
  return new GameEngineFactory()
}
