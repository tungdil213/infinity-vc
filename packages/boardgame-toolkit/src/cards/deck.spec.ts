import { describe, expect, test } from 'vitest';
import { SeededRandom } from '../random/prng.js';
import { Deck, createDeckFromTemplates, createStandard52Deck } from './deck.js';

describe('Deck', () => {
	test('draw/discard/reshuffle flow', () => {
		const deck = new Deck([1, 2, 3, 4], new SeededRandom(1));
		const drawn = deck.draw(2);

		expect(drawn).toEqual([1, 2]);
		deck.discard(drawn);
		expect(deck.drawCount).toBe(2);
		expect(deck.discardCount).toBe(2);

		deck.reshuffleDiscardsIntoDraw();
		expect(deck.discardCount).toBe(0);
		expect(deck.drawCount).toBe(4);
	});

	test('deals cards by player', () => {
		const deck = new Deck([1, 2, 3, 4, 5, 6], new SeededRandom(2));
		const hands = deck.deal(['p1', 'p2'], 2);

		expect(hands.p1).toHaveLength(2);
		expect(hands.p2).toHaveLength(2);
		expect(deck.drawCount).toBe(2);
	});

	test('supports snapshot restore', () => {
		const source = new Deck(['a', 'b', 'c']);
		source.draw(1);
		source.discard(['a']);

		const snapshot = source.toSnapshot();
		const restored = Deck.fromSnapshot(snapshot);

		expect(restored.getDrawPile()).toEqual(snapshot.drawPile);
		expect(restored.getDiscardPile()).toEqual(snapshot.discardPile);
	});
});

describe('card helpers', () => {
	test('creates a standard 52-card deck', () => {
		const cards = createStandard52Deck();
		expect(cards).toHaveLength(52);
		expect(new Set(cards.map((card) => card.id)).size).toBe(52);
	});

	test('duplicates templates by copy count', () => {
		const cards = createDeckFromTemplates(
			[
				{ id: 'guard', name: 'Guard' },
				{ id: 'priest', name: 'Priest' },
			],
			{ guard: 2, priest: 1 }
		);

		expect(cards.map((card) => card.id)).toEqual(['guard#1', 'guard#2', 'priest#1']);
	});
});
