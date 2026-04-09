import { describe, expect, it } from 'vitest';
import { signStableValue, verifyStableValueSignature } from './stable_signature.js';

describe('stable_signature', () => {
	it('creates deterministic signatures regardless of key insertion order', () => {
		const left = { b: 1, a: { y: 2, x: 1 } };
		const right = { a: { x: 1, y: 2 }, b: 1 };
		const secret = 'demo-secret';

		expect(signStableValue(left, secret)).toBe(signStableValue(right, secret));
	});

	it('verifies a valid signature', () => {
		const payload = { type: 'session.resumed', payload: { sessionId: 's-1' } };
		const secret = 'demo-secret';
		const signature = signStableValue(payload, secret);

		expect(verifyStableValueSignature(payload, secret, signature)).toBe(true);
	});

	it('fails verification on tampered payload and wrong secret', () => {
		const payload = { score: 1 };
		const signature = signStableValue(payload, 'secret-a');

		expect(verifyStableValueSignature({ score: 2 }, 'secret-a', signature)).toBe(false);
		expect(verifyStableValueSignature(payload, 'secret-b', signature)).toBe(false);
	});

	it('supports alternate algorithm and no-prefix mode', () => {
		const payload = { score: 10 };
		const secret = 'demo-secret';
		const signature = signStableValue(payload, secret, {
			algorithm: 'sha512',
			prefixAlgorithm: false,
		});

		expect(signature.includes(':')).toBe(false);
		expect(
			verifyStableValueSignature(payload, secret, signature, {
				algorithm: 'sha512',
			})
		).toBe(true);
	});

	it('rejects empty secret', () => {
		expect(() => signStableValue({ ok: true }, '')).toThrow('non-empty');
	});
});
