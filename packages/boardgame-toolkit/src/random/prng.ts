export interface RandomSource {
	next(): number;
	int(minInclusive: number, maxInclusive: number): number;
	bool(probability?: number): boolean;
	pick<T>(items: readonly T[]): T;
	shuffle<T>(items: readonly T[]): T[];
}

const UINT32_MAX = 0x1_00_00_00_00;

export class SeededRandom implements RandomSource {
	private state: number;

	constructor(seed: number | string = Date.now()) {
		this.state = this.normalizeSeed(seed);
	}

	next(): number {
		// Numerical Recipes LCG
		this.state = (Math.imul(1_664_525, this.state) + 1_013_904_223) >>> 0;
		return this.state / UINT32_MAX;
	}

	int(minInclusive: number, maxInclusive: number): number {
		const min = Math.ceil(Math.min(minInclusive, maxInclusive));
		const max = Math.floor(Math.max(minInclusive, maxInclusive));

		if (!Number.isFinite(min) || !Number.isFinite(max)) {
			throw new TypeError('Random bounds must be finite numbers');
		}

		const span = max - min + 1;
		if (span <= 0) {
			return min;
		}

		return min + Math.floor(this.next() * span);
	}

	bool(probability: number = 0.5): boolean {
		if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
			throw new Error('Probability must be between 0 and 1');
		}

		return this.next() < probability;
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error('Cannot pick from an empty collection');
		}

		return items[this.int(0, items.length - 1)];
	}

	shuffle<T>(items: readonly T[]): T[] {
		const shuffled = [...items];
		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			const target = this.int(0, index);
			const current = shuffled[index];
			shuffled[index] = shuffled[target];
			shuffled[target] = current;
		}

		return shuffled;
	}

	clone(): SeededRandom {
		const cloned = new SeededRandom(1);
		cloned.state = this.state;
		return cloned;
	}

	private normalizeSeed(seed: number | string): number {
		if (typeof seed === 'number') {
			if (!Number.isFinite(seed)) {
				throw new TypeError('Seed must be a finite number or string');
			}

			const normalized = Math.floor(seed) >>> 0;
			return normalized === 0 ? 1 : normalized;
		}

		let hash = 2_166_136_261 >>> 0;
		for (let index = 0; index < seed.length; index += 1) {
			hash ^= seed.charCodeAt(index);
			hash = Math.imul(hash, 16_777_619) >>> 0;
		}

		return hash === 0 ? 1 : hash;
	}
}

export const systemRandom: RandomSource = {
	next: () => Math.random(),
	int(minInclusive, maxInclusive) {
		const min = Math.ceil(Math.min(minInclusive, maxInclusive));
		const max = Math.floor(Math.max(minInclusive, maxInclusive));
		return min + Math.floor(Math.random() * (max - min + 1));
	},
	bool(probability = 0.5) {
		return Math.random() < probability;
	},
	pick<T>(items: readonly T[]) {
		if (items.length === 0) {
			throw new Error('Cannot pick from an empty collection');
		}
		const index = Math.floor(Math.random() * items.length);
		return items[index];
	},
	shuffle<T>(items: readonly T[]) {
		const shuffled = [...items];
		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			const target = Math.floor(Math.random() * (index + 1));
			const current = shuffled[index];
			shuffled[index] = shuffled[target];
			shuffled[target] = current;
		}
		return shuffled;
	},
};
