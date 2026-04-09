import { signStableValue, type StableSignatureAlgorithm, verifyStableValueSignature } from './stable_signature.js';
import type { KeyRingPolicy } from './key_ring_policy.js';

export interface StableEnvelopeSignerKey {
	readonly id: string;
	readonly secret: string;
	readonly algorithm?: StableSignatureAlgorithm;
}

export interface StableSignedEnvelope<TPayload = unknown> {
	readonly schemaVersion: number;
	readonly keyId: string;
	readonly algorithm: StableSignatureAlgorithm;
	readonly signedAt: string;
	readonly payload: TPayload;
	readonly signature: string;
}

export type StableEnvelopeVerificationReason =
	| 'invalid_envelope_schema'
	| 'missing_key_id'
	| 'unknown_key'
	| 'algorithm_mismatch'
	| 'key_policy_rejected'
	| 'invalid_signature';

export interface StableEnvelopeVerificationResult<TPayload = unknown> {
	readonly valid: boolean;
	readonly reason?: StableEnvelopeVerificationReason;
	readonly envelope: StableSignedEnvelope<TPayload>;
}

export interface StableEnvelopeSignerOptions {
	readonly activeKeyId?: string;
	readonly envelopeSchemaVersion?: number;
	readonly keyPolicy?: KeyRingPolicy;
}

interface NormalizedSignerKey {
	readonly id: string;
	readonly secret: string;
	readonly algorithm: StableSignatureAlgorithm;
}

const normalizeAlgorithm = (algorithm: StableSignatureAlgorithm | undefined): StableSignatureAlgorithm => {
	return algorithm ?? 'sha256';
};

const assertPositiveInteger = (value: number, label: string): void => {
	if (!Number.isInteger(value) || value < 1) {
		throw new TypeError(`${label} must be a positive integer`);
	}
};

const normalizeKeys = (keys: readonly StableEnvelopeSignerKey[]): readonly NormalizedSignerKey[] => {
	if (keys.length === 0) {
		throw new TypeError('At least one signer key is required');
	}

	const keyIds = new Set<string>();
	return keys.map((key) => {
		if (!key.id || !key.id.trim()) {
			throw new TypeError('Signer key id is required');
		}

		if (!key.secret || !key.secret.trim()) {
			throw new TypeError(`Signer key secret is required for key ${key.id}`);
		}

		if (keyIds.has(key.id)) {
			throw new TypeError(`Duplicate signer key id: ${key.id}`);
		}
		keyIds.add(key.id);

		return {
			id: key.id,
			secret: key.secret,
			algorithm: normalizeAlgorithm(key.algorithm),
		};
	});
};

export class StableEnvelopeSigner {
	private readonly keysById = new Map<string, NormalizedSignerKey>();
	private readonly keys: readonly NormalizedSignerKey[];
	private readonly activeKeyId: string;
	private readonly envelopeSchemaVersion: number;
	private readonly keyPolicy: KeyRingPolicy | null;

	constructor(keys: readonly StableEnvelopeSignerKey[], options: StableEnvelopeSignerOptions = {}) {
		this.keys = normalizeKeys(keys);
		for (const key of this.keys) {
			this.keysById.set(key.id, key);
		}

		const defaultActiveKeyId = this.keys[0]?.id;
		const activeKeyId = options.activeKeyId ?? defaultActiveKeyId;
		if (!activeKeyId || !this.keysById.has(activeKeyId)) {
			throw new TypeError(`Active signer key is invalid: ${activeKeyId ?? 'undefined'}`);
		}
		this.activeKeyId = activeKeyId;

		const envelopeSchemaVersion = options.envelopeSchemaVersion ?? 1;
		assertPositiveInteger(envelopeSchemaVersion, 'Envelope schemaVersion');
		this.envelopeSchemaVersion = envelopeSchemaVersion;
		this.keyPolicy = options.keyPolicy ?? null;
	}

	listKeyIds(): readonly string[] {
		return this.keys.map((key) => key.id);
	}

	getActiveKeyId(): string {
		return this.activeKeyId;
	}

	withActiveKey(nextActiveKeyId: string): StableEnvelopeSigner {
		return new StableEnvelopeSigner(this.keys, {
			activeKeyId: nextActiveKeyId,
			envelopeSchemaVersion: this.envelopeSchemaVersion,
			keyPolicy: this.keyPolicy ?? undefined,
		});
	}

	sign<TPayload>(
		payload: TPayload,
		options: {
			readonly keyId?: string;
			readonly signedAt?: string;
		} = {}
	): StableSignedEnvelope<TPayload> {
		const keyId = options.keyId ?? this.activeKeyId;
		const key = this.keysById.get(keyId);
		if (!key) {
			throw new Error(`Unknown signer key: ${keyId}`);
		}

		const signedAt = options.signedAt ?? new Date().toISOString();
		if (!signedAt) {
			throw new TypeError('signedAt must be non-empty');
		}

		if (this.keyPolicy && !this.keyPolicy.canSign(key.id, signedAt)) {
			throw new Error(`Key ${key.id} is not allowed for signing at ${signedAt}`);
		}

		const signature = signStableValue(payload, key.secret, {
			algorithm: key.algorithm,
			prefixAlgorithm: false,
		});

		return {
			schemaVersion: this.envelopeSchemaVersion,
			keyId: key.id,
			algorithm: key.algorithm,
			signedAt,
			payload,
			signature,
		};
	}

	verify<TPayload>(envelope: StableSignedEnvelope<TPayload>): boolean {
		return this.verifyWithResult(envelope).valid;
	}

	verifyWithResult<TPayload>(
		envelope: StableSignedEnvelope<TPayload>,
		options: {
			readonly verifiedAt?: string;
		} = {}
	): StableEnvelopeVerificationResult<TPayload> {
		if (!Number.isInteger(envelope.schemaVersion) || envelope.schemaVersion < 1) {
			return {
				valid: false,
				reason: 'invalid_envelope_schema',
				envelope,
			};
		}

		if (!envelope.keyId || !envelope.keyId.trim()) {
			return {
				valid: false,
				reason: 'missing_key_id',
				envelope,
			};
		}

		const key = this.keysById.get(envelope.keyId);
		if (!key) {
			return {
				valid: false,
				reason: 'unknown_key',
				envelope,
			};
		}

		if (key.algorithm !== envelope.algorithm) {
			return {
				valid: false,
				reason: 'algorithm_mismatch',
				envelope,
			};
		}

		if (
			this.keyPolicy &&
			!this.keyPolicy.canVerify(key.id, {
				signedAt: envelope.signedAt,
				verifiedAt: options.verifiedAt,
			})
		) {
			return {
				valid: false,
				reason: 'key_policy_rejected',
				envelope,
			};
		}

		try {
			const valid = verifyStableValueSignature(envelope.payload, key.secret, envelope.signature, {
				algorithm: envelope.algorithm,
			});

			if (!valid) {
				return {
					valid: false,
					reason: 'invalid_signature',
					envelope,
				};
			}

			return {
				valid: true,
				envelope,
			};
		} catch {
			return {
				valid: false,
				reason: 'invalid_signature',
				envelope,
			};
		}
	}
}
