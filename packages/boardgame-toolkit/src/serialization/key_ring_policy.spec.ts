import { describe, expect, it } from 'vitest';
import { KeyRingPolicy } from './key_ring_policy.js';

describe('KeyRingPolicy', () => {
	it('allows signing only with active keys in sign window', () => {
		const policy = new KeyRingPolicy([
			{
				keyId: 'k1',
				status: 'active',
				signWindow: {
					notBefore: '2026-01-01T00:00:00.000Z',
					notAfter: '2026-12-31T23:59:59.999Z',
				},
			},
		]);

		expect(policy.canSign('k1', '2026-06-01T00:00:00.000Z')).toBe(true);
		expect(policy.canSign('k1', '2027-01-01T00:00:00.000Z')).toBe(false);
	});

	it('blocks signing for deprecated/revoked keys but can allow verification for deprecated', () => {
		const policy = new KeyRingPolicy([
			{
				keyId: 'k-deprecated',
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
				keyId: 'k-revoked',
				status: 'revoked',
			},
		]);

		expect(policy.canSign('k-deprecated', '2025-06-01T00:00:00.000Z')).toBe(false);
		expect(
			policy.canVerify('k-deprecated', {
				signedAt: '2025-06-01T00:00:00.000Z',
				verifiedAt: '2026-06-01T00:00:00.000Z',
			})
		).toBe(true);
		expect(policy.canVerify('k-revoked')).toBe(false);
	});

	it('returns true by default for unknown keys', () => {
		const policy = new KeyRingPolicy([]);
		expect(policy.canSign('unknown')).toBe(true);
		expect(policy.canVerify('unknown')).toBe(true);
	});

	it('validates lifecycle rule windows', () => {
		expect(
			() =>
				new KeyRingPolicy([
					{
						keyId: 'k1',
						signWindow: {
							notBefore: '2026-12-01T00:00:00.000Z',
							notAfter: '2026-01-01T00:00:00.000Z',
						},
					},
				])
		).toThrow('notBefore must be <= notAfter');
	});
});
