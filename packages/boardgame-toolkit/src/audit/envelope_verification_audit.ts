import { type AuditEntry, type AuditSeverity, type AuditTrail } from './audit_trail.js';
import type { StableEnvelopeVerificationResult } from '../serialization/stable_envelope_signer.js';

export interface EnvelopeVerificationAuditOptions<TActorId extends string, TPayload> {
	readonly auditTrail: AuditTrail<TActorId>;
	readonly actorId: TActorId;
	readonly result: StableEnvelopeVerificationResult<TPayload>;
	readonly targetType?: string;
	readonly targetId?: string;
	readonly actionPrefix?: string;
	readonly includeSuccess?: boolean;
	readonly metadata?: Record<string, unknown>;
	readonly occurredAt?: string;
}

export const recordEnvelopeVerificationAudit = <TActorId extends string, TPayload>(
	options: EnvelopeVerificationAuditOptions<TActorId, TPayload>
): AuditEntry<TActorId, Record<string, unknown>> | null => {
	const actionPrefix = options.actionPrefix ?? 'envelope.verify';
	const baseMetadata: Record<string, unknown> = {
		keyId: options.result.envelope.keyId,
		algorithm: options.result.envelope.algorithm,
		signedAt: options.result.envelope.signedAt,
		valid: options.result.valid,
		...(options.metadata ?? {}),
	};

	if (options.result.valid) {
		if (!(options.includeSuccess ?? false)) {
			return null;
		}

		return options.auditTrail.append({
			action: `${actionPrefix}.success`,
			actorId: options.actorId,
			targetType: options.targetType,
			targetId: options.targetId,
			sensitive: false,
			severity: 'info',
			metadata: baseMetadata,
			occurredAt: options.occurredAt,
		});
	}

	const reason = options.result.reason ?? 'invalid_signature';
	const severity: AuditSeverity = reason === 'key_policy_rejected' ? 'critical' : 'warning';

	return options.auditTrail.appendSensitive({
		action: `${actionPrefix}.failed`,
		actorId: options.actorId,
		targetType: options.targetType,
		targetId: options.targetId,
		severity,
		metadata: {
			...baseMetadata,
			reason,
		},
		occurredAt: options.occurredAt,
	});
};
