/**
 * @tyfo.dev/game-engine
 * 
 * Generic game engine framework for building turn-based games.
 * This package provides core abstractions that can be extended
 * to implement any turn-based game (Love Letter, Uno, Chess, etc.)
 * 
 * @example
 * ```typescript
 * import { BaseGameEngine, StateMachine } from '@tyfo.dev/game-engine'
 * 
 * class MyGameEngine extends BaseGameEngine<MyState, MyAction> {
 *   // Implement your game logic
 * }
 * ```
 */

// Core exports - Engine, Rules, Types
export * from './core/index.js'

// State machine - Generic state management
export * from './state-machine/index.js'
