/**
 * Love Letter Game
 *
 * A game of risk, deduction, and luck for 2-4 players.
 * This module provides the complete Love Letter implementation
 * built on top of @tyfo.dev/game-engine.
 */

export {
  type CardType,
  type ICard,
  type ILoveLetterPlayer,
  type ILoveLetterState,
  type ILoveLetterAction,
  type LoveLetterPhase,
  type LoveLetterActionType,
  type LoveLetterActionResultType,
  type PlayCardPayload,
  CardTypes,
  Cards,
  LoveLetterActionTypes,
} from './types.js'

export { LoveLetterEngine, createLoveLetterEngine } from './engine.js'
