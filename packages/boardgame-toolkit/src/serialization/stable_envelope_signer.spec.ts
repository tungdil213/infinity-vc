import { describe, expect, it } from 'vitest';
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
});
