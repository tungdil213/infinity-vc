import { describe, expect, it } from 'vitest';
import { createGameLauncher } from '../../platform/launcher.js';
import { loveLetterInfinityModule } from './love_letter_infinity_module.js';
import {
	LoveLetterInfinityActionTypes,
	LoveLetterInfinityCardTypes,
	type LoveLetterInfinityAction,
	type LoveLetterInfinityState,
} from './domain/love_letter_infinity_types.js';

describe('loveLetterInfinityModule', () => {
	it('registers launcher metadata and validates settings', () => {
		const launcher = createGameLauncher([loveLetterInfinityModule]);
		const games = launcher.listGames();

		expect(games.some((game) => game.id === 'love-letter-infinity-gauntlet')).toBe(true);

		const invalidLaunch = launcher.launch({
			gameId: 'love-letter-infinity-gauntlet',
			players: [
				{ id: 'p1', name: 'Alice', isActive: true },
				{ id: 'p2', name: 'Bob', isActive: true },
			],
			settings: { deckMultiplier: 0 },
		});

		expect(invalidLaunch.isFailure).toBe(true);
	});

	it('supports 6 players and first elimination ends game with one loser and 5 winners', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const players = [
			{ id: 'p1', name: 'P1', isActive: true },
			{ id: 'p2', name: 'P2', isActive: true },
			{ id: 'p3', name: 'P3', isActive: true },
			{ id: 'p4', name: 'P4', isActive: true },
			{ id: 'p5', name: 'P5', isActive: true },
			{ id: 'p6', name: 'P6', isActive: true },
		];

		const init = engine.initialize(players, {
			settings: {
				deckMultiplier: 2,
				endOnFirstElimination: true,
				revealEliminatedHand: false,
			},
		});
		expect(init.isSuccess).toBe(true);
		if (init.isFailure) {
			return;
		}

		const forcedState: LoveLetterInfinityState = {
			...init.value,
			phase: 'play',
			currentPlayerId: 'p1',
			players: init.value.players.map((player) => {
				if (player.id === 'p1') {
					return {
						...player,
						hand: [LoveLetterInfinityCardTypes.GUARD, LoveLetterInfinityCardTypes.PRIEST],
					};
				}
				if (player.id === 'p2') {
					return {
						...player,
						hand: [LoveLetterInfinityCardTypes.KING],
					};
				}
				return player;
			}),
		};

		const action: LoveLetterInfinityAction = {
			type: LoveLetterInfinityActionTypes.PLAY_CARD,
			playerId: 'p1',
			timestamp: new Date(),
			payload: {
				cardType: LoveLetterInfinityCardTypes.GUARD,
				targetPlayerId: 'p2',
				guessedCard: LoveLetterInfinityCardTypes.KING,
			},
		};

		const executed = engine.executeAction(forcedState, action);
		expect(executed.isSuccess).toBe(true);
		if (executed.isFailure) {
			return;
		}

		const state = executed.value.newState;
		expect(state.isFinished).toBe(true);
		expect(state.loserId).toBe('p2');
		expect(state.winnerIds).toHaveLength(5);
		expect(state.winnerIds.includes('p1')).toBe(true);
		expect(state.winnerIds.includes('p2')).toBe(false);
		expect(engine.getWinners(state)).toHaveLength(5);

		const p1View = engine.getPlayerView(state, 'p1');
		const p3View = engine.getPlayerView(state, 'p3');
		const p2FromP3 = p3View.state.players?.find((player) => player.id === 'p2');

		expect((p1View.state.players?.find((player) => player.id === 'p1')?.hand.length ?? 0) > 0).toBe(true);
		expect(p2FromP3?.hand ?? []).toEqual([]);
	});
});
