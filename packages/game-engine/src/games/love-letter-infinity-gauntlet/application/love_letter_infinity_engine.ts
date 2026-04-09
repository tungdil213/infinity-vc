import type { Result } from '@infinity.dev/events';
import { BaseGameEngine } from '../../../core/engine.js';
import type { IActionResult, IGameConfig, IGameEvent, IGameMetadata, IPlayer } from '../../../core/types.js';
import {
	LoveLetterInfinityActionTypes,
	LoveLetterInfinityCards,
	LoveLetterInfinityCardTypes,
	type LoveLetterInfinityAction,
	type LoveLetterInfinityCardType,
	type LoveLetterInfinityPlayer,
	type LoveLetterInfinitySettings,
	type LoveLetterInfinityState,
	type PlayLoveLetterInfinityCardPayload,
} from '../domain/love_letter_infinity_types.js';

const defaultSettings: LoveLetterInfinitySettings = {
	deckMultiplier: 1,
	endOnFirstElimination: true,
	revealEliminatedHand: false,
};

export class LoveLetterInfinityEngine extends BaseGameEngine<LoveLetterInfinityState, LoveLetterInfinityAction> {
	readonly metadata: IGameMetadata = {
		gameType: 'love-letter-infinity-gauntlet',
		version: '1.0.0',
		description: 'Love Letter Infinity Gauntlet variant (2-6 players, one loser, all others winners)',
		minPlayers: 2,
		maxPlayers: 6,
		estimatedDuration: '20 minutes',
		complexity: 'medium',
	};

	initialize(players: IPlayer[], config?: Partial<IGameConfig>): Result<LoveLetterInfinityState, Error> {
		if (players.length < 2 || players.length > 6) {
			return this.failResult(new Error('Love Letter Infinity Gauntlet requires 2-6 players'));
		}

		const settings = this.resolveSettings(config?.settings);
		const deck = this.createDeck(settings.deckMultiplier);
		this.shuffleDeck(deck);

		const setAsideCard = deck.pop() ?? null;
		if (deck.length < players.length) {
			return this.failResult(new Error('Deck is too small for selected player count'));
		}

		const gamePlayers: LoveLetterInfinityPlayer[] = players.map((player) => ({
			...player,
			hand: [deck.pop() as LoveLetterInfinityCardType],
			discardPile: [],
			isEliminated: false,
			isProtected: false,
		}));

		const state: LoveLetterInfinityState = {
			gameId: crypto.randomUUID(),
			phase: 'draw',
			currentPlayerId: gamePlayers[0].id,
			players: gamePlayers,
			round: 1,
			turn: 1,
			isFinished: false,
			winnerId: null,
			winnerIds: [],
			loserId: null,
			deck,
			setAsideCard,
			settings,
			lastAction: null,
		};

		return this.successResult(state);
	}

	protected validateActionSpecific(
		state: LoveLetterInfinityState,
		action: LoveLetterInfinityAction
	): Result<void, Error> {
		const player = state.players.find((candidate) => candidate.id === action.playerId);
		if (!player) {
			return this.failResult(new Error('Player not found'));
		}

		if (player.isEliminated) {
			return this.failResult(new Error('Player is eliminated'));
		}

		if (action.type === LoveLetterInfinityActionTypes.PLAY_CARD) {
			const payload = action.payload as PlayLoveLetterInfinityCardPayload;
			if (!payload.cardType) {
				return this.failResult(new Error('cardType is required for play_card'));
			}

			if (!player.hand.includes(payload.cardType)) {
				return this.failResult(new Error('Card not in hand'));
			}

			if (
				player.hand.includes(LoveLetterInfinityCardTypes.COUNTESS) &&
				(player.hand.includes(LoveLetterInfinityCardTypes.KING) ||
					player.hand.includes(LoveLetterInfinityCardTypes.PRINCE)) &&
				payload.cardType !== LoveLetterInfinityCardTypes.COUNTESS
			) {
				return this.failResult(new Error('Countess must be discarded when holding King or Prince'));
			}

			return this.validatePlayPayload(state, player.id, payload);
		}

		return this.successResult(undefined);
	}

	executeAction(
		state: LoveLetterInfinityState,
		action: LoveLetterInfinityAction
	): Result<IActionResult<LoveLetterInfinityState>, Error> {
		const validation = this.validateAction(state, action);
		if (validation.isFailure) {
			return this.failResult(validation.error);
		}

		const events: IGameEvent[] = [];
		let nextState = { ...state };

		switch (action.type) {
			case LoveLetterInfinityActionTypes.DRAW_CARD:
				nextState = this.handleDrawCard(nextState, action.playerId, events);
				break;
			case LoveLetterInfinityActionTypes.PLAY_CARD:
				nextState = this.handlePlayCard(
					nextState,
					action.playerId,
					action.payload as PlayLoveLetterInfinityCardPayload,
					events
				);
				break;
			default:
				return this.failResult(new Error(`Unsupported action: ${action.type}`));
		}

		nextState = this.tryFinalizeGame(nextState, events);

		return this.successResult({
			success: true,
			newState: nextState,
			events,
		});
	}

	getAvailableActions(state: LoveLetterInfinityState, playerId: string): string[] {
		if (state.isFinished || state.currentPlayerId !== playerId) {
			return [];
		}

		const player = state.players.find((candidate) => candidate.id === playerId);
		if (!player || player.isEliminated) {
			return [];
		}

		if (state.phase === 'draw') {
			return [LoveLetterInfinityActionTypes.DRAW_CARD];
		}

		if (state.phase === 'play') {
			return [LoveLetterInfinityActionTypes.PLAY_CARD];
		}

		return [];
	}

	override getWinners(state: LoveLetterInfinityState): IPlayer[] {
		if (!state.isFinished || state.winnerIds.length === 0) {
			return [];
		}
		return state.players.filter((player) => state.winnerIds.includes(player.id));
	}

	protected filterStateForPlayer(state: LoveLetterInfinityState, playerId: string): Partial<LoveLetterInfinityState> {
		const players = state.players.map((player) => {
			if (player.id === playerId) {
				return player;
			}

			if (state.settings.revealEliminatedHand && player.isEliminated) {
				return player;
			}

			return {
				...player,
				hand: [],
			};
		});

		return {
			...state,
			players,
			deck: [],
			setAsideCard: null,
		};
	}

	private handleDrawCard(
		state: LoveLetterInfinityState,
		playerId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const playerIndex = state.players.findIndex((player) => player.id === playerId);
		const player = state.players[playerIndex];
		const deck = [...state.deck];
		const drawnCard = deck.pop() ?? state.setAsideCard;

		if (!drawnCard) {
			return this.finishByLowestCard(state, events);
		}

		const players = [...state.players];
		players[playerIndex] = {
			...player,
			hand: [...player.hand, drawnCard],
			isProtected: false,
		};

		events.push(this.buildEvent('lli.card_drawn', { playerId }, { type: 'private', playerIds: [playerId] }));

		return {
			...state,
			phase: 'play',
			players,
			deck,
			setAsideCard: deck.length === 0 ? null : state.setAsideCard,
			lastAction: {
				type: LoveLetterInfinityActionTypes.DRAW_CARD,
				playerId,
				timestamp: new Date(),
				payload: {},
			},
		};
	}

	private handlePlayCard(
		state: LoveLetterInfinityState,
		playerId: string,
		payload: PlayLoveLetterInfinityCardPayload,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const playerIndex = state.players.findIndex((player) => player.id === playerId);
		const player = state.players[playerIndex];
		const players = [...state.players];

		const hand = [...player.hand];
		const cardIndex = hand.indexOf(payload.cardType);
		hand.splice(cardIndex, 1);
		players[playerIndex] = {
			...player,
			hand,
			discardPile: [...player.discardPile, payload.cardType],
		};

		events.push(this.buildEvent('lli.card_played', { playerId, cardType: payload.cardType }, { type: 'public' }));

		let nextState: LoveLetterInfinityState = {
			...state,
			players,
			lastAction: {
				type: LoveLetterInfinityActionTypes.PLAY_CARD,
				playerId,
				timestamp: new Date(),
				payload,
			},
		};

		nextState = this.resolveCardEffect(nextState, playerId, payload, events);
		nextState = this.advanceToNextPlayer(nextState);
		return nextState;
	}

	private resolveCardEffect(
		state: LoveLetterInfinityState,
		playerId: string,
		payload: PlayLoveLetterInfinityCardPayload,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const { cardType, targetPlayerId, guessedCard } = payload;
		let nextState = { ...state };

		switch (cardType) {
			case LoveLetterInfinityCardTypes.GUARD:
				if (targetPlayerId && guessedCard && guessedCard !== LoveLetterInfinityCardTypes.GUARD) {
					const target = nextState.players.find((player) => player.id === targetPlayerId);
					if (target && !target.isProtected && target.hand[0] === guessedCard) {
						nextState = this.eliminatePlayer(nextState, targetPlayerId, events);
					}
				}
				break;
			case LoveLetterInfinityCardTypes.PRIEST:
				if (targetPlayerId) {
					const target = nextState.players.find((player) => player.id === targetPlayerId);
					if (target && !target.isProtected) {
						events.push(
							this.buildEvent(
								'lli.hand_revealed',
								{ targetPlayerId, hand: target.hand },
								{ type: 'private', playerIds: [playerId] }
							)
						);
					}
				}
				break;
			case LoveLetterInfinityCardTypes.BARON:
				if (targetPlayerId) {
					nextState = this.resolveBaron(nextState, playerId, targetPlayerId, events);
				}
				break;
			case LoveLetterInfinityCardTypes.HANDMAID: {
				const ownerIndex = nextState.players.findIndex((player) => player.id === playerId);
				const players = [...nextState.players];
				players[ownerIndex] = { ...players[ownerIndex], isProtected: true };
				nextState = { ...nextState, players };
				break;
			}
			case LoveLetterInfinityCardTypes.PRINCE: {
				const targetId = targetPlayerId ?? playerId;
				nextState = this.resolvePrince(nextState, playerId, targetId, events);
				break;
			}
			case LoveLetterInfinityCardTypes.KING:
				if (targetPlayerId) {
					nextState = this.resolveKing(nextState, playerId, targetPlayerId, events);
				}
				break;
			case LoveLetterInfinityCardTypes.PRINCESS:
				nextState = this.eliminatePlayer(nextState, playerId, events);
				break;
			default:
				break;
		}

		return nextState;
	}

	private resolveBaron(
		state: LoveLetterInfinityState,
		playerId: string,
		targetPlayerId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const player = state.players.find((candidate) => candidate.id === playerId);
		const target = state.players.find((candidate) => candidate.id === targetPlayerId);
		if (!player || !target || target.isProtected || player.hand.length === 0 || target.hand.length === 0) {
			return state;
		}

		const playerValue = LoveLetterInfinityCards[player.hand[0]].value;
		const targetValue = LoveLetterInfinityCards[target.hand[0]].value;

		events.push(
			this.buildEvent(
				'lli.hands_compared',
				{ playerId, targetPlayerId, playerValue, targetValue },
				{ type: 'private', playerIds: [playerId, targetPlayerId] }
			)
		);

		if (playerValue < targetValue) {
			return this.eliminatePlayer(state, playerId, events);
		}
		if (targetValue < playerValue) {
			return this.eliminatePlayer(state, targetPlayerId, events);
		}
		return state;
	}

	private resolvePrince(
		state: LoveLetterInfinityState,
		playerId: string,
		targetPlayerId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const targetIndex = state.players.findIndex((candidate) => candidate.id === targetPlayerId);
		if (targetIndex < 0) {
			return state;
		}
		const target = state.players[targetIndex];
		if ((target.id !== playerId && target.isProtected) || target.hand.length === 0) {
			return state;
		}

		const discardedCard = target.hand[0];
		if (discardedCard === LoveLetterInfinityCardTypes.PRINCESS) {
			return this.eliminatePlayer(state, targetPlayerId, events);
		}

		const deck = [...state.deck];
		const drawnCard = deck.pop() ?? state.setAsideCard;
		if (!drawnCard) {
			return this.eliminatePlayer(state, targetPlayerId, events);
		}

		const players = [...state.players];
		players[targetIndex] = {
			...target,
			hand: [drawnCard],
			discardPile: [...target.discardPile, discardedCard],
		};

		events.push(this.buildEvent('lli.card_discarded', { playerId: targetPlayerId, discardedCard }, { type: 'public' }));

		return {
			...state,
			players,
			deck,
			setAsideCard: deck.length === 0 ? null : state.setAsideCard,
		};
	}

	private resolveKing(
		state: LoveLetterInfinityState,
		playerId: string,
		targetPlayerId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const playerIndex = state.players.findIndex((candidate) => candidate.id === playerId);
		const targetIndex = state.players.findIndex((candidate) => candidate.id === targetPlayerId);
		if (playerIndex < 0 || targetIndex < 0) {
			return state;
		}

		const player = state.players[playerIndex];
		const target = state.players[targetIndex];
		if (target.isProtected || player.hand.length === 0 || target.hand.length === 0) {
			return state;
		}

		const players = [...state.players];
		players[playerIndex] = { ...player, hand: [...target.hand] };
		players[targetIndex] = { ...target, hand: [...player.hand] };

		events.push(
			this.buildEvent(
				'lli.hands_traded',
				{ player1Id: playerId, player2Id: targetPlayerId },
				{ type: 'private', playerIds: [playerId, targetPlayerId] }
			)
		);

		return { ...state, players };
	}

	private eliminatePlayer(
		state: LoveLetterInfinityState,
		playerId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const playerIndex = state.players.findIndex((candidate) => candidate.id === playerId);
		if (playerIndex < 0) {
			return state;
		}

		const players = [...state.players];
		const player = players[playerIndex];
		players[playerIndex] = {
			...player,
			isEliminated: true,
			discardPile: [...player.discardPile, ...player.hand],
			hand: [],
		};

		events.push(
			this.buildEvent(
				'lli.player_eliminated',
				{
					playerId,
					...(state.settings.revealEliminatedHand ? { discardedHand: player.hand } : {}),
				},
				{ type: 'public' }
			)
		);

		return { ...state, players };
	}

	private advanceToNextPlayer(state: LoveLetterInfinityState): LoveLetterInfinityState {
		const activePlayers = state.players.filter((player) => !player.isEliminated);
		if (activePlayers.length <= 1) {
			return state;
		}

		const currentIndex = activePlayers.findIndex((player) => player.id === state.currentPlayerId);
		const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % activePlayers.length;
		return {
			...state,
			phase: 'draw',
			currentPlayerId: activePlayers[nextIndex].id,
			turn: state.turn + 1,
		};
	}

	private tryFinalizeGame(state: LoveLetterInfinityState, events: IGameEvent[]): LoveLetterInfinityState {
		if (state.isFinished) {
			return state;
		}

		const eliminatedPlayers = state.players.filter((player) => player.isEliminated);
		if (state.settings.endOnFirstElimination && eliminatedPlayers.length >= 1) {
			return this.finishWithLoser(state, eliminatedPlayers[0].id, events);
		}

		const activePlayers = state.players.filter((player) => !player.isEliminated);
		if (activePlayers.length <= 1) {
			const loser = state.players.find((player) => player.isEliminated)?.id ?? null;
			if (loser) {
				return this.finishWithLoser(state, loser, events);
			}
			if (activePlayers.length === 1) {
				const inferredLoser = state.players.find((player) => player.id !== activePlayers[0].id)?.id;
				if (inferredLoser) {
					return this.finishWithLoser(state, inferredLoser, events);
				}
			}
		}

		if (state.deck.length === 0 && state.phase === 'draw') {
			return this.finishByLowestCard(state, events);
		}

		return state;
	}

	private finishByLowestCard(state: LoveLetterInfinityState, events: IGameEvent[]): LoveLetterInfinityState {
		const activePlayers = state.players.filter((player) => !player.isEliminated && player.hand.length > 0);
		if (activePlayers.length === 0) {
			return state;
		}

		let loser = activePlayers[0];
		for (const player of activePlayers.slice(1)) {
			const playerValue = LoveLetterInfinityCards[player.hand[0]].value;
			const loserValue = LoveLetterInfinityCards[loser.hand[0]].value;
			if (playerValue < loserValue || (playerValue === loserValue && player.id < loser.id)) {
				loser = player;
			}
		}

		events.push(
			this.buildEvent('lli.deck_exhausted', { loserId: loser.id, reason: 'lowest_hand_value' }, { type: 'public' })
		);
		return this.finishWithLoser(state, loser.id, events);
	}

	private finishWithLoser(
		state: LoveLetterInfinityState,
		loserId: string,
		events: IGameEvent[]
	): LoveLetterInfinityState {
		const winnerIds = state.players.filter((player) => player.id !== loserId).map((player) => player.id);
		events.push(this.buildEvent('lli.game_finished', { loserId, winnerIds }, { type: 'public' }));
		return {
			...state,
			phase: 'game_over',
			isFinished: true,
			loserId,
			winnerIds,
			winnerId: winnerIds[0] ?? null,
		};
	}

	private validatePlayPayload(
		state: LoveLetterInfinityState,
		playerId: string,
		payload: PlayLoveLetterInfinityCardPayload
	): Result<void, Error> {
		switch (payload.cardType) {
			case LoveLetterInfinityCardTypes.GUARD: {
				const targetValidation = this.validateTargetSelection(state, playerId, payload.targetPlayerId, {
					cardLabel: 'Guard',
					includeSelf: false,
					allowMissingWhenNoTargets: true,
				});
				if (targetValidation.isFailure) {
					return targetValidation;
				}
				if (!payload.targetPlayerId) {
					return this.successResult(undefined);
				}
				if (!payload.guessedCard) {
					return this.failResult(new Error('guessedCard is required for guard'));
				}
				if (payload.guessedCard === LoveLetterInfinityCardTypes.GUARD) {
					return this.failResult(new Error('Guard cannot guess Guard'));
				}
				return this.successResult(undefined);
			}
			case LoveLetterInfinityCardTypes.PRIEST:
				return this.validateTargetSelection(state, playerId, payload.targetPlayerId, {
					cardLabel: 'Priest',
					includeSelf: false,
					allowMissingWhenNoTargets: true,
				});
			case LoveLetterInfinityCardTypes.BARON:
				return this.validateTargetSelection(state, playerId, payload.targetPlayerId, {
					cardLabel: 'Baron',
					includeSelf: false,
					allowMissingWhenNoTargets: true,
				});
			case LoveLetterInfinityCardTypes.PRINCE:
				if (!payload.targetPlayerId) {
					return this.successResult(undefined);
				}
				return this.validateTargetSelection(state, playerId, payload.targetPlayerId, {
					cardLabel: 'Prince',
					includeSelf: true,
					allowMissingWhenNoTargets: true,
				});
			case LoveLetterInfinityCardTypes.KING:
				return this.validateTargetSelection(state, playerId, payload.targetPlayerId, {
					cardLabel: 'King',
					includeSelf: false,
					allowMissingWhenNoTargets: true,
				});
			default:
				return this.successResult(undefined);
		}
	}

	private validateTargetSelection(
		state: LoveLetterInfinityState,
		playerId: string,
		targetPlayerId: string | undefined,
		options: {
			cardLabel: string;
			includeSelf: boolean;
			allowMissingWhenNoTargets: boolean;
		}
	): Result<void, Error> {
		const legalTargets = this.getLegalTargets(state, playerId, options.includeSelf);

		if (!targetPlayerId) {
			if (legalTargets.length === 0 && options.allowMissingWhenNoTargets) {
				return this.successResult(undefined);
			}
			return this.failResult(new Error(`${options.cardLabel} requires a target player`));
		}

		const target = state.players.find((candidate) => candidate.id === targetPlayerId);
		if (!target) {
			return this.failResult(new Error('Target player not found'));
		}

		if (target.isEliminated) {
			return this.failResult(new Error('Target player is eliminated'));
		}

		if (!options.includeSelf && target.id === playerId) {
			return this.failResult(new Error(`${options.cardLabel} cannot target yourself`));
		}

		if (target.id !== playerId && target.isProtected) {
			return this.failResult(new Error('Target player is protected'));
		}

		return this.successResult(undefined);
	}

	private getLegalTargets(
		state: LoveLetterInfinityState,
		playerId: string,
		includeSelf: boolean
	): LoveLetterInfinityPlayer[] {
		return state.players.filter((candidate) => {
			if (candidate.isEliminated) {
				return false;
			}

			if (candidate.id === playerId) {
				return includeSelf;
			}

			return !candidate.isProtected;
		});
	}

	private createDeck(multiplier: number): LoveLetterInfinityCardType[] {
		const deck: LoveLetterInfinityCardType[] = [];
		for (let i = 0; i < multiplier; i += 1) {
			for (const card of Object.values(LoveLetterInfinityCards)) {
				for (let count = 0; count < card.count; count += 1) {
					deck.push(card.type);
				}
			}
		}
		return deck;
	}

	private shuffleDeck(deck: LoveLetterInfinityCardType[]): void {
		for (let i = deck.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[deck[i], deck[j]] = [deck[j], deck[i]];
		}
	}

	private resolveSettings(rawSettings: unknown): LoveLetterInfinitySettings {
		const partial = (rawSettings as Partial<LoveLetterInfinitySettings>) ?? {};
		const deckMultiplier = Math.max(1, Math.min(4, Number(partial.deckMultiplier ?? defaultSettings.deckMultiplier)));

		return {
			deckMultiplier,
			endOnFirstElimination: partial.endOnFirstElimination ?? defaultSettings.endOnFirstElimination,
			revealEliminatedHand: partial.revealEliminatedHand ?? defaultSettings.revealEliminatedHand,
		};
	}

	private buildEvent(type: string, payload: unknown, visibility: IGameEvent['visibility']): IGameEvent {
		return {
			type,
			payload,
			visibility,
			timestamp: new Date(),
		};
	}

	private successResult<TValue>(value: TValue): Result<TValue, Error> {
		return {
			isSuccess: true,
			isFailure: false,
			value,
		} as Result<TValue, Error>;
	}

	private failResult<TValue>(error: Error): Result<TValue, Error> {
		return {
			isSuccess: false,
			isFailure: true,
			error,
		} as Result<TValue, Error>;
	}
}
