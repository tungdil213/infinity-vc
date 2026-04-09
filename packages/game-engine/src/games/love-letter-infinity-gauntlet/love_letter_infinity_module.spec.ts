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
		expect(loveLetterInfinityModule.definition.presentation?.playerView).toBe('hidden-hand-player-list');
		expect(loveLetterInfinityModule.definition.presentation?.rendererKind).toBe('turn-based-card-hand');
		expect(loveLetterInfinityModule.definition.presentation?.pollingIntervalMs).toBe(5000);
		expect(loveLetterInfinityModule.definition.presentation?.showReplayDiff).toBe(true);
		expect(loveLetterInfinityModule.definition.presentation?.rendererOptions).toEqual({
			sections: {
				players: 'Players',
				hand: 'Your Hand',
				actions: 'Actions',
				replay: 'Replay Timeline',
				spectator: 'Spectator View',
				guess: 'Guess a Card',
			},
			summary: {
				roundResult: 'Round Result',
			},
		});

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

	it('rejects player counts outside the 2-6 range', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const onePlayer = engine.initialize([{ id: 'p1', name: 'Solo', isActive: true }]);
		const sevenPlayers = engine.initialize(
			Array.from({ length: 7 }, (_, index) => ({
				id: `p${index + 1}`,
				name: `P${index + 1}`,
				isActive: true,
			}))
		);

		expect(onePlayer.isFailure).toBe(true);
		expect(sevenPlayers.isFailure).toBe(true);
	});

	it('requires a legal target when a targetable opponent exists', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const initialized = engine.initialize([
			{ id: 'p1', name: 'Alice', isActive: true },
			{ id: 'p2', name: 'Bob', isActive: true },
		]);

		expect(initialized.isSuccess).toBe(true);
		if (initialized.isFailure) {
			return;
		}

		const forcedState: LoveLetterInfinityState = {
			...initialized.value,
			phase: 'play',
			currentPlayerId: 'p1',
			players: initialized.value.players.map((player) =>
				player.id === 'p1'
					? {
							...player,
							hand: [LoveLetterInfinityCardTypes.GUARD, LoveLetterInfinityCardTypes.HANDMAID],
						}
					: player
			),
		};

		const action: LoveLetterInfinityAction = {
			type: LoveLetterInfinityActionTypes.PLAY_CARD,
			playerId: 'p1',
			timestamp: new Date(),
			payload: {
				cardType: LoveLetterInfinityCardTypes.GUARD,
				guessedCard: LoveLetterInfinityCardTypes.KING,
			},
		};

		const executed = engine.executeAction(forcedState, action);
		expect(executed.isFailure).toBe(true);
		if (executed.isFailure) {
			expect(executed.error.message).toContain('requires a target player');
		}
	});

	it('advances to the next player after a valid non-eliminating play', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const initialized = engine.initialize([
			{ id: 'p1', name: 'Alice', isActive: true },
			{ id: 'p2', name: 'Bob', isActive: true },
		]);

		expect(initialized.isSuccess).toBe(true);
		if (initialized.isFailure) {
			return;
		}

		const forcedState: LoveLetterInfinityState = {
			...initialized.value,
			phase: 'play',
			currentPlayerId: 'p1',
			players: initialized.value.players.map((player) =>
				player.id === 'p1'
					? {
							...player,
							hand: [LoveLetterInfinityCardTypes.HANDMAID, LoveLetterInfinityCardTypes.GUARD],
						}
					: {
							...player,
							hand: [LoveLetterInfinityCardTypes.KING],
						}
			),
		};

		const action: LoveLetterInfinityAction = {
			type: LoveLetterInfinityActionTypes.PLAY_CARD,
			playerId: 'p1',
			timestamp: new Date(),
			payload: {
				cardType: LoveLetterInfinityCardTypes.HANDMAID,
			},
		};

		const executed = engine.executeAction(forcedState, action);
		expect(executed.isSuccess).toBe(true);
		if (executed.isFailure) {
			return;
		}

		expect(executed.value.newState.phase).toBe('draw');
		expect(executed.value.newState.currentPlayerId).toBe('p2');
		expect(executed.value.newState.turn).toBe(2);
		expect(executed.value.newState.players.find((player) => player.id === 'p1')?.isProtected).toBe(true);
	});

	it('allows a targeted card to be discarded without a target when every opponent is protected (hypothesis)', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const initialized = engine.initialize([
			{ id: 'p1', name: 'Alice', isActive: true },
			{ id: 'p2', name: 'Bob', isActive: true },
			{ id: 'p3', name: 'Cara', isActive: true },
		]);

		expect(initialized.isSuccess).toBe(true);
		if (initialized.isFailure) {
			return;
		}

		const forcedState: LoveLetterInfinityState = {
			...initialized.value,
			phase: 'play',
			currentPlayerId: 'p1',
			players: initialized.value.players.map((player) => {
				if (player.id === 'p1') {
					return {
						...player,
						hand: [LoveLetterInfinityCardTypes.PRIEST, LoveLetterInfinityCardTypes.GUARD],
					};
				}

				return {
					...player,
					isProtected: true,
					hand: [LoveLetterInfinityCardTypes.KING],
				};
			}),
		};

		const action: LoveLetterInfinityAction = {
			type: LoveLetterInfinityActionTypes.PLAY_CARD,
			playerId: 'p1',
			timestamp: new Date(),
			payload: {
				cardType: LoveLetterInfinityCardTypes.PRIEST,
			},
		};

		const executed = engine.executeAction(forcedState, action);
		expect(executed.isSuccess).toBe(true);
		if (executed.isFailure) {
			return;
		}

		expect(executed.value.newState.currentPlayerId).toBe('p2');
		expect(executed.value.newState.phase).toBe('draw');
	});

	it('allows Prince to target yourself even while protected', () => {
		const engine = loveLetterInfinityModule.createEngine();
		const initialized = engine.initialize([
			{ id: 'p1', name: 'Alice', isActive: true },
			{ id: 'p2', name: 'Bob', isActive: true },
		]);

		expect(initialized.isSuccess).toBe(true);
		if (initialized.isFailure) {
			return;
		}

		const forcedState: LoveLetterInfinityState = {
			...initialized.value,
			phase: 'play',
			currentPlayerId: 'p1',
			deck: [LoveLetterInfinityCardTypes.PRIEST],
			players: initialized.value.players.map((player) =>
				player.id === 'p1'
					? {
							...player,
							isProtected: true,
							hand: [LoveLetterInfinityCardTypes.PRINCE, LoveLetterInfinityCardTypes.GUARD],
						}
					: {
							...player,
							hand: [LoveLetterInfinityCardTypes.KING],
						}
			),
		};

		const action: LoveLetterInfinityAction = {
			type: LoveLetterInfinityActionTypes.PLAY_CARD,
			playerId: 'p1',
			timestamp: new Date(),
			payload: {
				cardType: LoveLetterInfinityCardTypes.PRINCE,
				targetPlayerId: 'p1',
			},
		};

		const executed = engine.executeAction(forcedState, action);
		expect(executed.isSuccess).toBe(true);
		if (executed.isFailure) {
			return;
		}

		expect(executed.value.newState.players.find((player) => player.id === 'p1')?.hand).toEqual([
			LoveLetterInfinityCardTypes.PRIEST,
		]);
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
