/**
 * Base types for game engine
 */

/**
 * Player identifier
 */
export interface IPlayer {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
}

/**
 * Game configuration
 */
export interface IGameConfig {
  readonly gameType: string
  readonly minPlayers: number
  readonly maxPlayers: number
  readonly settings: Record<string, unknown>
}

/**
 * Base game state - must be serializable
 */
export interface IGameState {
  readonly gameId: string
  readonly phase: string
  readonly currentPlayerId: string | null
  readonly players: IPlayer[]
  readonly round: number
  readonly turn: number
  readonly isFinished: boolean
  readonly winnerId: string | null
}

/**
 * Action input from player
 */
export interface IAction<TPayload = unknown> {
  readonly type: string
  readonly playerId: string
  readonly payload: TPayload
  readonly timestamp: Date
}

/**
 * Action result - what happened after executing an action
 */
export interface IActionResult<TState extends IGameState = IGameState> {
  readonly success: boolean
  readonly newState: TState
  readonly events: IGameEvent[]
  readonly error?: string
}

/**
 * Game event - something that happened in the game
 */
export interface IGameEvent<TPayload = unknown> {
  readonly type: string
  readonly payload: TPayload
  readonly visibility: EventVisibility
  readonly timestamp: Date
}

/**
 * Event visibility - who can see this event
 */
export type EventVisibility =
  | { type: 'public' }
  | { type: 'private'; playerIds: string[] }
  | { type: 'hidden' }

/**
 * Player view - what a specific player can see
 */
export interface IPlayerView<TState extends IGameState = IGameState> {
  readonly playerId: string
  readonly state: Partial<TState>
  readonly availableActions: string[]
  readonly isMyTurn: boolean
}

/**
 * Game metadata
 */
export interface IGameMetadata {
  readonly gameType: string
  readonly version: string
  readonly description: string
  readonly minPlayers: number
  readonly maxPlayers: number
  readonly estimatedDuration: string
  readonly complexity: 'simple' | 'medium' | 'complex'
}
