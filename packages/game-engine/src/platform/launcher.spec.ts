import { describe, expect, it } from 'vitest';
import { createGameLauncher } from './launcher.js';
import { LauncherStates } from './orchestration-machine.js';
import { rockPaperScissorsModule } from '../games/rock-paper-scissors/rock_paper_scissors_module.js';

const players = [
	{ id: 'p1', name: 'Alice', isActive: true },
	{ id: 'p2', name: 'Bob', isActive: true },
];

describe('GameLauncher', () => {
	it('lists available games and starts session with settings', async () => {
		const launcher = createGameLauncher([rockPaperScissorsModule]);

		const games = launcher.listGames();
		expect(games).toHaveLength(1);
		expect(games[0].id).toBe('rock-paper-scissors');

		const launched = launcher.launch({
			gameId: 'rock-paper-scissors',
			players,
			settings: { roundsToWin: 2, allowDrawReplay: true },
		});

		expect(launched.isSuccess).toBe(true);
		if (launched.isFailure) {
			throw launched.error;
		}

		const started = await launcher.startSession(launched.value);
		expect(started.isSuccess).toBe(true);
		if (started.isFailure) {
			throw started.error;
		}

		expect(started.value.machine.currentState).toBe(LauncherStates.RUNNING);
	});

	it('fails launch when settings are invalid', () => {
		const launcher = createGameLauncher([rockPaperScissorsModule]);
		const launched = launcher.launch({
			gameId: 'rock-paper-scissors',
			players,
			settings: { roundsToWin: 0 },
		});

		expect(launched.isFailure).toBe(true);
		if (launched.isFailure) {
			expect(launched.error.message).toContain('Invalid settings');
		}
	});
});
