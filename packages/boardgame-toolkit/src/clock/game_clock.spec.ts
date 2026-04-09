import { describe, expect, it } from 'vitest';
import { GameClock } from './game_clock.js';

describe('GameClock', () => {
	it('tracks elapsed time for active players and applies increment on switch', () => {
		const clock = new GameClock(['p1', 'p2'] as const, 60_000, 2000);

		clock.start('p1', 0);
		expect(clock.remaining('p1', 10_000)).toBe(50_000);

		clock.switchTo('p2', 10_000);
		expect(clock.remaining('p1', 10_000)).toBe(52_000);
		expect(clock.remaining('p2', 25_000)).toBe(45_000);

		clock.pause(30_000);
		expect(clock.currentPlayer()).toBeNull();
		expect(clock.remaining('p2', 90_000)).toBe(40_000);
	});

	it('flags players when time reaches zero', () => {
		const clock = new GameClock(['p1', 'p2'] as const, 5000);

		clock.start('p1', 0);
		expect(clock.isFlagged('p1', 4999)).toBe(false);
		expect(clock.isFlagged('p1', 5001)).toBe(true);
		expect(clock.flaggedPlayers(5001)).toEqual(['p1']);
	});

	it('restores snapshot and resumes active player timer', () => {
		const initial = new GameClock(['p1', 'p2'] as const, 10_000);
		initial.start('p1', 0);

		const snapshot = initial.toSnapshot(1000);
		const restored = GameClock.fromSnapshot(snapshot, 5000);

		expect(restored.currentPlayer()).toBe('p1');
		expect(restored.remaining('p1', 6000)).toBe(8000);
		expect(restored.remaining('p2', 6000)).toBe(10_000);
	});
});
