import { describe, expect, it } from 'vitest';
import { StableEnvelopeSigner } from '../serialization/stable_envelope_signer.js';
import { AuditTrail } from './audit_trail.js';
import { recordEnvelopeVerificationAudit } from './envelope_verification_audit.js';

describe('recordEnvelopeVerificationAudit', () => {
	it('writes failed verification as sensitive audit entry', () => {
		const signer = new StableEnvelopeSigner([{ id: 'k1', secret: 'secret-1' }]);
		const envelope = signer.sign({ score: 10 });
		const result = signer.verifyWithResult({
			...envelope,
			payload: { score: 11 },
		});

		const audit = new AuditTrail<'system'>();
		const entry = recordEnvelopeVerificationAudit({
			auditTrail: audit,
			actorId: 'system',
			result,
			targetType: 'import',
			targetId: 'batch-1',
		});

		expect(entry).not.toBeNull();
		expect(entry?.sensitive).toBe(true);
		expect(entry?.action).toBe('envelope.verify.failed');
		expect((entry?.metadata as { reason: string }).reason).toBe('invalid_signature');
	});

	it('can optionally log successful verification', () => {
		const signer = new StableEnvelopeSigner([{ id: 'k1', secret: 'secret-1' }]);
		const envelope = signer.sign({ score: 10 });
		const result = signer.verifyWithResult(envelope);

		const audit = new AuditTrail<'system'>();
		const entry = recordEnvelopeVerificationAudit({
			auditTrail: audit,
			actorId: 'system',
			result,
			includeSuccess: true,
		});

		expect(entry).not.toBeNull();
		expect(entry?.action).toBe('envelope.verify.success');
		expect(entry?.sensitive).toBe(false);
	});

	it('skips success audit when includeSuccess is false', () => {
		const signer = new StableEnvelopeSigner([{ id: 'k1', secret: 'secret-1' }]);
		const result = signer.verifyWithResult(signer.sign({ score: 10 }));
		const audit = new AuditTrail<'system'>();

		const entry = recordEnvelopeVerificationAudit({
			auditTrail: audit,
			actorId: 'system',
			result,
		});

		expect(entry).toBeNull();
		expect(audit.listAll()).toHaveLength(0);
	});
});
