import { describe, expect, it } from 'vitest';
import { KeyRingPolicy } from './key_ring_policy.js';
import { StableEnvelopeSigner } from './stable_envelope_signer.js';

describe('StableEnvelopeSigner', () => {
	it('signs and verifies payloads with active key', () => {
		const signer = new StableEnvelopeSigner([
			{ id: 'k1', secret: 'secret-1' },
			{ id: 'k2', secret: 'secret-2', algorithm: 'sha512' },
		]);

		const envelope = signer.sign({
			type: 'session.resumed',
			payload: { sessionId: 's-1' },
		});

		expect(envelope.keyId).toBe('k1');
		expect(signer.verify(envelope)).toBe(true);
	});

	it('supports active key rotation', () => {
		const signer = new StableEnvelopeSigner(
			[
				{ id: 'k1', secret: 'secret-1' },
				{ id: 'k2', secret: 'secret-2' },
			],
			{ activeKeyId: 'k1' }
		);

		const rotated = signer.withActiveKey('k2');
		const envelope = rotated.sign({ score: 10 });
		expect(envelope.keyId).toBe('k2');
		expect(rotated.verify(envelope)).toBe(true);
	});

	it('fails verification on unknown key or tampered payload', () => {
		const signer = new StableEnvelopeSigner([{ id: 'k1', secret: 'secret-1' }]);
		const envelope = signer.sign({ score: 10 });

		expect(
			signer.verify({
				...envelope,
				keyId: 'unknown',
			})
		).toBe(false);

		expect(
			signer.verify({
				...envelope,
				payload: { score: 11 },
			})
		).toBe(false);
	});

	it('validates key set consistency', () => {
		expect(() => new StableEnvelopeSigner([])).toThrow('At least one signer key is required');
		expect(() => {
			return new StableEnvelopeSigner([
				{ id: 'k1', secret: 'a' },
				{ id: 'k1', secret: 'b' },
			]);
		}).toThrow('Duplicate signer key id');
	});

	it('enforces key policy for signing and verification', () => {
		const keyPolicy = new KeyRingPolicy([
			{
				keyId: 'k1',
				status: 'deprecated',
				signWindow: {
					notBefore: '2025-01-01T00:00:00.000Z',
					notAfter: '2026-01-01T00:00:00.000Z',
				},
				verifyWindow: {
					notAfter: '2027-01-01T00:00:00.000Z',
				},
			},
			{
				keyId: 'k2',
				status: 'active',
				signWindow: {
					notBefore: '2026-01-01T00:00:00.000Z',
					notAfter: '2028-01-01T00:00:00.000Z',
				},
			},
		]);

		const signer = new StableEnvelopeSigner(
			[
				{ id: 'k1', secret: 'secret-1' },
				{ id: 'k2', secret: 'secret-2' },
			],
			{
				activeKeyId: 'k2',
				keyPolicy,
			}
		);

		expect(() =>
			signer.sign(
				{
					value: 1,
				},
				{
					keyId: 'k1',
					signedAt: '2026-06-01T00:00:00.000Z',
				}
			)
		).toThrow('not allowed for signing');

		const envelope = signer.sign({ value: 1 }, { signedAt: '2026-06-01T00:00:00.000Z' });
		expect(signer.verify(envelope)).toBe(true);
	});
});
