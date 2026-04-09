import { describe, expect, test } from 'vitest';
import { SeededRandom } from '../random/prng.js';
import { TokenBag } from './token_bag.js';

describe('TokenBag', () => {
	test('draws weighted tokens and updates counts', () => {
		const bag = new TokenBag({ gold: 3, silver: 1 }, new SeededRandom('bag'));

		const drawn = bag.draw(2);

		expect(drawn).toHaveLength(2);
		expect(bag.totalCount()).toBe(2);
	});

	test('supports snapshot restore', () => {
		const bag = new TokenBag({ red: 2, blue: 1 });
		bag.draw(1);

		const snapshot = bag.toSnapshot();
		const restored = TokenBag.fromSnapshot(snapshot);

		expect(restored.totalCount()).toBe(bag.totalCount());
		expect(restored.toSnapshot()).toEqual(snapshot);
	});
});
