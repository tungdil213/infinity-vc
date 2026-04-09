import { describe, expect, test } from 'vitest';
import { ZoneBoard } from './zone_board.js';

describe('ZoneBoard', () => {
	test('adds and moves items between zones', () => {
		const board = new ZoneBoard<string>([{ id: 'deck' }, { id: 'hand' }, { id: 'discard' }]);

		board.add('deck', 'card-1').add('deck', 'card-2');

		const moved = board.moveWhere('deck', 'hand', (card) => card === 'card-1');

		expect(moved).toEqual(['card-1']);
		expect(board.list('hand')).toEqual(['card-1']);
		expect(board.list('deck')).toEqual(['card-2']);
	});

	test('enforces zone capacity', () => {
		const board = new ZoneBoard<string>([{ id: 'slot', capacity: 1 }]);
		board.add('slot', 'token-1');

		expect(() => board.add('slot', 'token-2')).toThrowError('Zone slot is full');
	});
});
