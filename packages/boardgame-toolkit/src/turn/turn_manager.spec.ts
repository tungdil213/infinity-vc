import { describe, expect, test } from 'vitest';
import { TurnManager } from './turn_manager.js';

describe('TurnManager', () => {
	test('rotates and increments rounds when wrapping', () => {
		const manager = new TurnManager(['p1', 'p2', 'p3']);

		expect(manager.getCurrentPlayer()).toBe('p1');
		expect(manager.nextTurn()).toBe('p2');
		expect(manager.nextTurn()).toBe('p3');
		expect(manager.nextTurn()).toBe('p1');
		expect(manager.getRound()).toBe(2);
	});

	test('supports reverse direction', () => {
		const manager = new TurnManager(['p1', 'p2', 'p3']);
		manager.reverseDirection();

		expect(manager.nextTurn()).toBe('p3');
		expect(manager.nextTurn()).toBe('p2');
	});

	test('skips one player once', () => {
		const manager = new TurnManager(['p1', 'p2', 'p3']);
		manager.skipPlayerOnce('p2');

		expect(manager.nextTurn()).toBe('p3');
		expect(manager.nextTurn()).toBe('p1');
		expect(manager.nextTurn()).toBe('p2');
	});

	test('removes a player from order', () => {
		const manager = new TurnManager(['p1', 'p2', 'p3']);

		expect(manager.removePlayer('p2')).toBe(true);
		expect(manager.getPlayers()).toEqual(['p1', 'p3']);
	});
});
