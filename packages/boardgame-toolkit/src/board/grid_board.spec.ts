import { describe, expect, it } from 'vitest';
import { GridBoard } from './grid_board.js';

describe('GridBoard', () => {
	it('sets, gets and moves cells with occupancy rules', () => {
		const board = new GridBoard<string>(3, 3);

		board.set({ x: 0, y: 0 }, 'knight');
		expect(board.get({ x: 0, y: 0 })).toBe('knight');

		board.move({ x: 0, y: 0 }, { x: 1, y: 0 });
		expect(board.get({ x: 0, y: 0 })).toBeUndefined();
		expect(board.get({ x: 1, y: 0 })).toBe('knight');

		board.set({ x: 2, y: 0 }, 'archer');
		expect(() => board.move({ x: 1, y: 0 }, { x: 2, y: 0 })).toThrow('occupied');
		board.move({ x: 1, y: 0 }, { x: 2, y: 0 }, { overwrite: true });

		expect(board.get({ x: 2, y: 0 })).toBe('knight');
	});

	it('returns neighbors by requested neighborhood', () => {
		const board = new GridBoard<number>(4, 4);

		const orthogonal = board.neighbors({ x: 1, y: 1 }, 'orthogonal');
		expect(orthogonal).toEqual([
			{ x: 1, y: 0 },
			{ x: 2, y: 1 },
			{ x: 1, y: 2 },
			{ x: 0, y: 1 },
		]);

		const diagonal = board.neighbors({ x: 1, y: 1 }, 'diagonal');
		expect(diagonal).toEqual([
			{ x: 0, y: 0 },
			{ x: 2, y: 0 },
			{ x: 2, y: 2 },
			{ x: 0, y: 2 },
		]);

		const all = board.neighbors({ x: 0, y: 0 }, 'all');
		expect(all).toEqual([
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
		]);
	});

	it('supports snapshots restoration', () => {
		const board = new GridBoard<string>(2, 2);
		board.set({ x: 0, y: 1 }, 'token');

		const restored = GridBoard.fromSnapshot(board.toSnapshot());

		expect(restored.get({ x: 0, y: 1 })).toBe('token');
		expect(restored.width).toBe(2);
		expect(restored.height).toBe(2);
	});
});
