import { systemRandom } from '../random/prng.js';
import type { RandomSource } from '../random/prng.js';

export interface TokenBagSnapshot<TToken extends string> {
	readonly quantities: Record<TToken, number>;
}

export class TokenBag<TToken extends string> {
	private quantities = new Map<TToken, number>();

	constructor(
		initialTokens: Partial<Record<TToken, number>> = {},
		private readonly rng: RandomSource = systemRandom
	) {
		for (const [token, rawCount] of Object.entries(initialTokens) as [TToken, number | undefined][]) {
			if (typeof rawCount !== 'number' || !Number.isFinite(rawCount) || rawCount <= 0) {
				continue;
			}

			this.quantities.set(token, Math.floor(rawCount));
		}
	}

	count(token: TToken): number {
		return this.quantities.get(token) ?? 0;
	}

	totalCount(): number {
		return [...this.quantities.values()].reduce((sum, value) => sum + value, 0);
	}

	add(token: TToken, count: number = 1): this {
		this.assertPositiveInteger(count, 'add');
		this.quantities.set(token, this.count(token) + count);
		return this;
	}

	remove(token: TToken, count: number = 1): this {
		this.assertPositiveInteger(count, 'remove');
		const current = this.count(token);

		if (count > current) {
			throw new Error(`Cannot remove ${count} ${token}; only ${current} available`);
		}

		const remaining = current - count;
		if (remaining === 0) {
			this.quantities.delete(token);
		} else {
			this.quantities.set(token, remaining);
		}

		return this;
	}

	draw(count: number = 1): TToken[] {
		this.assertPositiveInteger(count, 'draw');

		const drawn: TToken[] = [];
		for (let index = 0; index < count; index += 1) {
			if (this.totalCount() === 0) {
				break;
			}

			const token = this.drawOne();
			drawn.push(token);
		}

		return drawn;
	}

	toSnapshot(): TokenBagSnapshot<TToken> {
		return {
			quantities: Object.fromEntries(this.quantities.entries()) as Record<TToken, number>,
		};
	}

	static fromSnapshot<TToken extends string>(
		snapshot: TokenBagSnapshot<TToken>,
		rng: RandomSource = systemRandom
	): TokenBag<TToken> {
		return new TokenBag(snapshot.quantities, rng);
	}

	private drawOne(): TToken {
		const total = this.totalCount();
		const target = this.rng.int(1, total);

		let cursor = 0;
		for (const [token, quantity] of this.quantities.entries()) {
			cursor += quantity;
			if (target <= cursor) {
				this.remove(token, 1);
				return token;
			}
		}

		throw new Error('Token draw failed unexpectedly');
	}

	private assertPositiveInteger(value: number, operation: string): void {
		if (!Number.isInteger(value) || value < 1) {
			throw new Error(`TokenBag ${operation} count must be a positive integer`);
		}
	}
}
