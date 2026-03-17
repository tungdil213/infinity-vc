/**
 * Love Letter Game
 *
 * A game of risk, deduction, and luck for 2-4 players.
 * This module provides the complete Love Letter implementation
 * built on top of @infinity.dev/game-engine.
 */

export {
  type CardType,
  type CardDefinition,
  type LoveLetterPlayer,
  type LoveLetterState,
  type LoveLetterAction,
  type LoveLetterPhase,
  type LoveLetterActionType,
  type LoveLetterActionResultType,
  type PlayCardPayload,
  CardTypes,
  Cards,
  LoveLetterActionTypes,
} from '#games/love-letter/types'

export { LoveLetterEngine, createLoveLetterEngine } from '#games/love-letter/engine'
