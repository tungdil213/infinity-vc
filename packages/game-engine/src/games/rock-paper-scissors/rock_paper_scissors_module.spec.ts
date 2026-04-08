import { describe, expect, it } from 'vitest';
import { rockPaperScissorsModule } from './rock_paper_scissors_module.js';
import { RpsActionTypes } from './domain/rps_types.js';

const players = [
	{ id: 'p1', name: 'Alice', isActive: true },
	{ id: 'p2', name: 'Bob', isActive: true },
];

describe('rockPaperScissorsModule', () => {
	it('exposes settings and metadata for launcher usage', () => {
		expect(rockPaperScissorsModule.definition.id).toBe('rock-paper-scissors');
		expect(rockPaperScissorsModule.definition.settings.fields.length).toBe(2);
		expect(rockPaperScissorsModule.definition.metadata.minPlayers).toBe(2);
		expect(rockPaperScissorsModule.definition.presentation?.playerView).toBe('raw');
	});

	it('plays a full match and reaches a winner', () => {
		const engine = rockPaperScissorsModule.createEngine();
		const initialized = engine.initialize(players, {
			gameType: 'rock-paper-scissors',
			minPlayers: 2,
			maxPlayers: 2,
			settings: { roundsToWin: 2, allowDrawReplay: true },
		});

		expect(initialized.isSuccess).toBe(true);
		if (initialized.isFailure) {
			throw initialized.error;
		}

		let state = initialized.value;
		const rounds = [
			['rock', 'scissors'],
			['paper', 'rock'],
		] as const;

		for (const [p1Move, p2Move] of rounds) {
			const firstAction = engine.executeAction(state, {
				type: RpsActionTypes.SUBMIT_MOVE,
				playerId: 'p1',
				timestamp: new Date(),
				payload: { move: p1Move },
			});
			if (firstAction.isFailure) {
				throw firstAction.error;
			}
			state = firstAction.value.newState;

			const secondAction = engine.executeAction(state, {
				type: RpsActionTypes.SUBMIT_MOVE,
				playerId: 'p2',
				timestamp: new Date(),
				payload: { move: p2Move },
			});
			if (secondAction.isFailure) {
				throw secondAction.error;
			}
			state = secondAction.value.newState;
		}

		expect(state.isFinished).toBe(true);
		expect(state.winnerId).toBe('p1');
		expect(state.scores.p1).toBe(2);
		expect(state.rounds.length).toBe(2);
	});
});
