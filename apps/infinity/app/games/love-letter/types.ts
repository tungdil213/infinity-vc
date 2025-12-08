/**
 * Love Letter Game Types
 * 
 * This module defines all types specific to the Love Letter card game.
 * It extends the generic game engine types from @tyfo.dev/game-engine.
 */
import type { IGameState, IAction, IPlayer } from '@tyfo.dev/game-engine/core'

/**
 * Love Letter card types
 */
export const CardTypes = {
  GUARD: 'guard',
  PRIEST: 'priest',
  BARON: 'baron',
  HANDMAID: 'handmaid',
  PRINCE: 'prince',
  KING: 'king',
  COUNTESS: 'countess',
  PRINCESS: 'princess',
} as const

export type CardType = (typeof CardTypes)[keyof typeof CardTypes]

/**
 * Card definition
 */
export interface ICard {
  readonly type: CardType
  readonly value: number
  readonly name: string
  readonly description: string
  readonly count: number // How many in deck
}

/**
 * Card database - All 16 cards in the Love Letter deck
 */
export const Cards: Record<CardType, ICard> = {
  [CardTypes.GUARD]: {
    type: CardTypes.GUARD,
    value: 1,
    name: 'Guard',
    description: 'Name a non-Guard card. If the opponent has that card, they are eliminated.',
    count: 5,
  },
  [CardTypes.PRIEST]: {
    type: CardTypes.PRIEST,
    value: 2,
    name: 'Priest',
    description: "Look at another player's hand.",
    count: 2,
  },
  [CardTypes.BARON]: {
    type: CardTypes.BARON,
    value: 3,
    name: 'Baron',
    description: 'Compare hands with another player. Lower value is eliminated.',
    count: 2,
  },
  [CardTypes.HANDMAID]: {
    type: CardTypes.HANDMAID,
    value: 4,
    name: 'Handmaid',
    description: "Until your next turn, ignore all effects from other players' cards.",
    count: 2,
  },
  [CardTypes.PRINCE]: {
    type: CardTypes.PRINCE,
    value: 5,
    name: 'Prince',
    description: 'Choose a player (including yourself) to discard their hand and draw a new card.',
    count: 2,
  },
  [CardTypes.KING]: {
    type: CardTypes.KING,
    value: 6,
    name: 'King',
    description: 'Trade hands with another player.',
    count: 1,
  },
  [CardTypes.COUNTESS]: {
    type: CardTypes.COUNTESS,
    value: 7,
    name: 'Countess',
    description: 'If you have the King or Prince in your hand, you must discard the Countess.',
    count: 1,
  },
  [CardTypes.PRINCESS]: {
    type: CardTypes.PRINCESS,
    value: 8,
    name: 'Princess',
    description: 'If you discard this card, you are eliminated.',
    count: 1,
  },
}

/**
 * Love Letter player with hand and status
 */
export interface ILoveLetterPlayer extends IPlayer {
  readonly hand: CardType[]
  readonly discardPile: CardType[]
  readonly isEliminated: boolean
  readonly isProtected: boolean // Handmaid protection
  readonly tokensOfAffection: number
}

/**
 * Love Letter game phase
 */
export type LoveLetterPhase =
  | 'setup'
  | 'draw'
  | 'play'
  | 'resolve'
  | 'round_end'
  | 'game_over'

/**
 * Love Letter game state
 */
export interface ILoveLetterState extends IGameState {
  readonly phase: LoveLetterPhase
  readonly players: ILoveLetterPlayer[]
  readonly deck: CardType[]
  readonly setAsideCard: CardType | null // Face-down card at start
  readonly publicDiscards: CardType[] // Face-up discards for 2-player
  readonly lastAction: ILoveLetterAction | null
  readonly tokensToWin: number
}

/**
 * Love Letter action types
 */
export const LoveLetterActionTypes = {
  DRAW_CARD: 'draw_card',
  PLAY_CARD: 'play_card',
  TARGET_PLAYER: 'target_player',
  GUESS_CARD: 'guess_card',
  ACKNOWLEDGE: 'acknowledge',
} as const

export type LoveLetterActionType = (typeof LoveLetterActionTypes)[keyof typeof LoveLetterActionTypes]

/**
 * Play card action payload
 */
export interface PlayCardPayload {
  cardType: CardType
  targetPlayerId?: string
  guessedCard?: CardType // For Guard
}

/**
 * Love Letter action
 */
export interface ILoveLetterAction extends IAction<PlayCardPayload> {
  readonly type: LoveLetterActionType
}

/**
 * Action result types
 */
export type LoveLetterActionResultType =
  | 'card_played'
  | 'player_eliminated'
  | 'hand_revealed'
  | 'hands_compared'
  | 'hands_traded'
  | 'card_discarded'
  | 'protection_granted'
  | 'round_won'
  | 'game_won'
