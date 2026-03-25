import { describe, expect, test } from 'vitest';
import { SeededRandom } from './prng.js';

describe('SeededRandom', () => {
	test('is deterministic for same seed', () => {
		const left = new SeededRandom('same-seed');
		const right = new SeededRandom('same-seed');

		const leftValues = Array.from({ length: 5 }, () => left.next());
		const rightValues = Array.from({ length: 5 }, () => right.next());

		expect(leftValues).toEqual(rightValues);
	});

	test('int returns numbers inside inclusive bounds', () => {
		const rng = new SeededRandom(42);
		const values = Array.from({ length: 20 }, () => rng.int(2, 4));

		expect(values.every((value) => value >= 2 && value <= 4)).toBe(true);
	});

	test('shuffle keeps all elements', () => {
		const rng = new SeededRandom(7);
		const input = ['a', 'b', 'c', 'd'];
		const shuffled = rng.shuffle(input);

		expect(shuffled).toHaveLength(input.length);
		expect([...shuffled].sort()).toEqual([...input].sort());
	});
});
