import type { IAction, IGameState, IPlayer } from '../../../core/index.js';

export const LoveLetterInfinityCardTypes = {
	GUARD: 'guard',
	PRIEST: 'priest',
	BARON: 'baron',
	HANDMAID: 'handmaid',
	PRINCE: 'prince',
	KING: 'king',
	COUNTESS: 'countess',
	PRINCESS: 'princess',
} as const;

export type LoveLetterInfinityCardType = (typeof LoveLetterInfinityCardTypes)[keyof typeof LoveLetterInfinityCardTypes];

export interface LoveLetterInfinityCardDefinition {
	readonly type: LoveLetterInfinityCardType;
	readonly value: number;
	readonly name: string;
	readonly description: string;
	readonly count: number;
}

export const LoveLetterInfinityCards: Record<LoveLetterInfinityCardType, LoveLetterInfinityCardDefinition> = {
	[LoveLetterInfinityCardTypes.GUARD]: {
		type: LoveLetterInfinityCardTypes.GUARD,
		value: 1,
		name: 'Guard',
		description: 'Guess a non-Guard card. If correct, the target is eliminated.',
		count: 5,
	},
	[LoveLetterInfinityCardTypes.PRIEST]: {
		type: LoveLetterInfinityCardTypes.PRIEST,
		value: 2,
		name: 'Priest',
		description: "Look at another player's hand.",
		count: 2,
	},
	[LoveLetterInfinityCardTypes.BARON]: {
		type: LoveLetterInfinityCardTypes.BARON,
		value: 3,
		name: 'Baron',
		description: 'Compare hands. Lower value is eliminated.',
		count: 2,
	},
	[LoveLetterInfinityCardTypes.HANDMAID]: {
		type: LoveLetterInfinityCardTypes.HANDMAID,
		value: 4,
		name: 'Handmaid',
		description: 'Gain protection until your next turn.',
		count: 2,
	},
	[LoveLetterInfinityCardTypes.PRINCE]: {
		type: LoveLetterInfinityCardTypes.PRINCE,
		value: 5,
		name: 'Prince',
		description: 'A chosen player discards their hand and draws a new card.',
		count: 2,
	},
	[LoveLetterInfinityCardTypes.KING]: {
		type: LoveLetterInfinityCardTypes.KING,
		value: 6,
		name: 'King',
		description: 'Trade hands with another player.',
		count: 1,
	},
	[LoveLetterInfinityCardTypes.COUNTESS]: {
		type: LoveLetterInfinityCardTypes.COUNTESS,
		value: 7,
		name: 'Countess',
		description: 'Must be discarded with King or Prince in hand.',
		count: 1,
	},
	[LoveLetterInfinityCardTypes.PRINCESS]: {
		type: LoveLetterInfinityCardTypes.PRINCESS,
		value: 8,
		name: 'Princess',
		description: 'If discarded, you are eliminated.',
		count: 1,
	},
};

export interface LoveLetterInfinityPlayer extends IPlayer {
	readonly hand: LoveLetterInfinityCardType[];
	readonly discardPile: LoveLetterInfinityCardType[];
	readonly isEliminated: boolean;
	readonly isProtected: boolean;
}

export interface LoveLetterInfinitySettings {
	readonly deckMultiplier: number;
	readonly endOnFirstElimination: boolean;
	readonly revealEliminatedHand: boolean;
}

export type LoveLetterInfinityPhase = 'draw' | 'play' | 'game_over';

export interface PlayLoveLetterInfinityCardPayload {
	readonly cardType: LoveLetterInfinityCardType;
	readonly targetPlayerId?: string;
	readonly guessedCard?: LoveLetterInfinityCardType;
}

export const LoveLetterInfinityActionTypes = {
	DRAW_CARD: 'draw_card',
	PLAY_CARD: 'play_card',
} as const;

export type LoveLetterInfinityActionType =
	(typeof LoveLetterInfinityActionTypes)[keyof typeof LoveLetterInfinityActionTypes];

export interface LoveLetterInfinityAction extends IAction<Partial<PlayLoveLetterInfinityCardPayload>> {
	readonly type: LoveLetterInfinityActionType;
}

export interface LoveLetterInfinityState extends IGameState {
	readonly phase: LoveLetterInfinityPhase;
	readonly players: LoveLetterInfinityPlayer[];
	readonly deck: LoveLetterInfinityCardType[];
	readonly setAsideCard: LoveLetterInfinityCardType | null;
	readonly settings: LoveLetterInfinitySettings;
	readonly winnerIds: string[];
	readonly loserId: string | null;
	readonly lastAction: LoveLetterInfinityAction | null;
}
