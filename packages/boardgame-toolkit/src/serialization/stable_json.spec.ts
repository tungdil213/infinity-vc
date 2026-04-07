import { describe, expect, it } from 'vitest';
import { canonicalizeJsonValue, stableJsonStringify } from './stable_json.js';

describe('stable_json', () => {
	it('sorts object keys recursively while preserving array order', () => {
		const input = {
			z: 1,
			a: {
				b: 2,
				a: 1,
			},
			list: [
				{ y: 2, x: 1 },
				{ b: 2, a: 1 },
			],
		};

		const normalized = canonicalizeJsonValue(input);
		expect(normalized).toEqual({
			a: { a: 1, b: 2 },
			list: [
				{ x: 1, y: 2 },
				{ a: 1, b: 2 },
			],
			z: 1,
		});
	});

	it('produces deterministic output regardless of insertion order', () => {
		const left = { b: 1, a: { y: 2, x: 1 } };
		const right = { a: { x: 1, y: 2 }, b: 1 };

		expect(stableJsonStringify(left)).toBe(stableJsonStringify(right));
		expect(stableJsonStringify(left)).toBe('{"a":{"x":1,"y":2},"b":1}');
	});
});
