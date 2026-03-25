import { systemRandom } from '../random/prng.js';
import type { RandomSource } from '../random/prng.js';

export interface CardTemplate<TMeta = unknown> {
	readonly id: string;
	readonly name: string;
	readonly suit?: string;
	readonly rank?: string;
	readonly value?: number;
	readonly meta?: TMeta;
}

export interface DeckSnapshot<TCard> {
	readonly drawPile: readonly TCard[];
	readonly discardPile: readonly TCard[];
}

export class Deck<TCard> {
	private drawPile: TCard[];
	private discardPile: TCard[] = [];

	constructor(
		cards: readonly TCard[],
		private readonly rng: RandomSource = systemRandom
	) {
		this.drawPile = [...cards];
	}

	get drawCount(): number {
		return this.drawPile.length;
	}

	get discardCount(): number {
		return this.discardPile.length;
	}

	get totalCount(): number {
		return this.drawPile.length + this.discardPile.length;
	}

	isEmpty(): boolean {
		return this.drawPile.length === 0 && this.discardPile.length === 0;
	}

	shuffle(): this {
		this.drawPile = this.rng.shuffle(this.drawPile);
		return this;
	}

	draw(count: number = 1): TCard[] {
		if (!Number.isInteger(count) || count < 0) {
			throw new Error('Draw count must be a non-negative integer');
		}

		if (count === 0 || this.drawPile.length === 0) {
			return [];
		}

		return this.drawPile.splice(0, count);
	}

	peek(count: number = 1): TCard[] {
		if (!Number.isInteger(count) || count < 0) {
			throw new Error('Peek count must be a non-negative integer');
		}

		return this.drawPile.slice(0, count);
	}

	discard(cards: readonly TCard[]): this {
		this.discardPile.push(...cards);
		return this;
	}

	discardFromDraw(count: number = 1): TCard[] {
		const cards = this.draw(count);
		this.discard(cards);
		return cards;
	}

	reshuffleDiscardsIntoDraw(): this {
		if (this.discardPile.length === 0) {
			return this;
		}

		this.drawPile = this.rng.shuffle([...this.drawPile, ...this.discardPile]);
		this.discardPile = [];
		return this;
	}

	insertOnTop(cards: readonly TCard[]): this {
		this.drawPile = [...cards, ...this.drawPile];
		return this;
	}

	insertOnBottom(cards: readonly TCard[]): this {
		this.drawPile = [...this.drawPile, ...cards];
		return this;
	}

	sort(compare: (left: TCard, right: TCard) => number): this {
		this.drawPile = [...this.drawPile].sort(compare);
		return this;
	}

	removeWhere(predicate: (card: TCard) => boolean, max: number = Number.POSITIVE_INFINITY): TCard[] {
		const removed: TCard[] = [];
		const kept: TCard[] = [];

		for (const card of this.drawPile) {
			if (removed.length < max && predicate(card)) {
				removed.push(card);
			} else {
				kept.push(card);
			}
		}

		this.drawPile = kept;
		return removed;
	}

	deal(playerIds: readonly string[], countPerPlayer: number): Record<string, TCard[]> {
		if (!Number.isInteger(countPerPlayer) || countPerPlayer < 0) {
			throw new Error('countPerPlayer must be a non-negative integer');
		}

		const hands = Object.fromEntries(playerIds.map((id) => [id, [] as TCard[]]));

		for (const playerId of playerIds) {
			hands[playerId] = this.draw(countPerPlayer);
		}

		return hands;
	}

	getDrawPile(): readonly TCard[] {
		return [...this.drawPile];
	}

	getDiscardPile(): readonly TCard[] {
		return [...this.discardPile];
	}

	toSnapshot(): DeckSnapshot<TCard> {
		return {
			drawPile: [...this.drawPile],
			discardPile: [...this.discardPile],
		};
	}

	static fromSnapshot<TCard>(snapshot: DeckSnapshot<TCard>, rng: RandomSource = systemRandom): Deck<TCard> {
		const deck = new Deck(snapshot.drawPile, rng);
		deck.discardPile = [...snapshot.discardPile];
		return deck;
	}
}

export const createStandard52Deck = (): CardTemplate[] => {
	const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
	const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

	const valueByRank: Record<string, number> = {
		A: 1,
		J: 11,
		Q: 12,
		K: 13,
	};

	return suits.flatMap((suit) =>
		ranks.map((rank) => ({
			id: `${rank}-${suit}`,
			name: `${rank.toString()} of ${suit}`,
			suit,
			rank,
			value: valueByRank[rank] ?? Number.parseInt(rank, 10),
		}))
	);
};

export const createDeckFromTemplates = <TCard extends CardTemplate>(
	templates: readonly TCard[],
	copies: number | Record<string, number> = 1
): TCard[] => {
	if (templates.length === 0) {
		return [];
	}

	const result: TCard[] = [];
	for (const template of templates) {
		const countForCard = typeof copies === 'number' ? copies : (copies[template.id] ?? 1);

		if (!Number.isInteger(countForCard) || countForCard < 0) {
			throw new Error(`Invalid card copy count for ${template.id}`);
		}

		for (let index = 0; index < countForCard; index += 1) {
			result.push({ ...template, id: `${template.id}#${index + 1}` } as TCard);
		}
	}

	return result;
};
