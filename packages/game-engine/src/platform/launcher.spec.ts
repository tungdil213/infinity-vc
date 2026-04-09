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
		expect(launcher.getGameDefinition('rock-paper-scissors')?.playerConstraints).toEqual({
			minPlayers: 2,
			maxPlayers: 2,
		});

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
		expect(started.value.state).not.toBeNull();
		expect(started.value.state?.phase).toBe('waiting_move');
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

	it('fails launch when player count is outside game constraints', () => {
		const launcher = createGameLauncher([rockPaperScissorsModule]);
		const launched = launcher.launch({
			gameId: 'rock-paper-scissors',
			players: [{ id: 'p1', name: 'Alice', isActive: true }],
			settings: { roundsToWin: 2 },
		});

		expect(launched.isFailure).toBe(true);
		if (launched.isFailure) {
			expect(launched.error.message).toContain('Invalid player count');
		}
	});

	it('returns catalog entries filtered by capabilities and licensing', () => {
		const launcher = createGameLauncher([rockPaperScissorsModule]);
		const proprietaryModule = {
			...rockPaperScissorsModule,
			definition: {
				...rockPaperScissorsModule.definition,
				id: 'secret-rps',
				displayName: 'Secret RPS',
				licensing: {
					distribution: 'proprietary' as const,
				},
				capabilities: ['turn-based', 'live-play'] as const,
			},
		};

		launcher.register(proprietaryModule);
		expect(launcher.listCatalog()).toHaveLength(2);
		expect(launcher.listOpenSourceGames()).toHaveLength(1);
		expect(
			launcher.listCatalog({
				requiredCapabilities: ['simultaneous-turns'],
				includeProprietary: true,
			})
		).toHaveLength(1);
	});

	it('rejects modules with duplicate setting keys', () => {
		const launcher = createGameLauncher([]);
		const invalidModule = {
			...rockPaperScissorsModule,
			definition: {
				...rockPaperScissorsModule.definition,
				id: 'invalid-rps',
				settings: {
					...rockPaperScissorsModule.definition.settings,
					fields: [
						{
							key: 'duplicate',
							label: 'Duplicate',
							type: 'number' as const,
							defaultValue: 1,
						},
						{
							key: 'duplicate',
							label: 'Duplicate again',
							type: 'number' as const,
							defaultValue: 2,
						},
					],
				},
			},
		};

		expect(() => launcher.register(invalidModule)).toThrowError(/Duplicate setting key/);
	});
});
