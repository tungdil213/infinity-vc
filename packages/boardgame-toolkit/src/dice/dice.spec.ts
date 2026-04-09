import { describe, expect, test } from 'vitest';
import { SeededRandom } from '../random/prng.js';
import { createNumericDie, parseDiceNotation, rollNotation } from './dice.js';

describe('dice', () => {
	test('parses notation', () => {
		expect(parseDiceNotation('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
		expect(parseDiceNotation('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
	});

	test('rollNotation computes deterministic total with seed', () => {
		const result = rollNotation('3d6+2', new SeededRandom('dice-seed'));

		expect(result.rolls).toHaveLength(3);
		expect(result.total).toBe(result.subtotal + 2);
	});

	test('createNumericDie creates right number of faces', () => {
		const d8 = createNumericDie(8);
		expect(d8.faces).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});
});
