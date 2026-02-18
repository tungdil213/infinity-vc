import { describe, expect, it } from 'vitest';
import { defaultLauncher } from './default_launcher.js';

describe('defaultLauncher', () => {
	it('registers built-in game modules', () => {
		const games = defaultLauncher.listGames();
		expect(games.some((game) => game.id === 'rock-paper-scissors')).toBe(true);
	});
});
