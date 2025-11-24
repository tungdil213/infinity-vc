import type { Result } from '#shared_kernel/domain/result'
import type { GameState } from '../value_objects/game_state.vo.js'

/**
 * Game Plugin Interface
 * Tous les jeux doivent implémenter cette interface
 */
export interface GamePlugin {
  readonly name: string
  readonly version: string
  readonly minPlayers: number
  readonly maxPlayers: number

  /**
   * Initialize game state
   */
  initialize(playerIds: string[]): Result<GameState>

  /**
   * Validate a move
   */
  validateMove(state: GameState, playerId: string, move: any): Result<boolean>

  /**
   * Apply a move to the state
   */
  applyMove(state: GameState, playerId: string, move: any): Result<GameState>

  /**
   * Check if game is finished
   */
  isGameFinished(state: GameState): boolean

  /**
   * Get winner (if any)
   */
  getWinner(state: GameState): string | null
}
