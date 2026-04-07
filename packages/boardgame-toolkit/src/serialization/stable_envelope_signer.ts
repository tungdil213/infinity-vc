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
		assertPositiveInteger(envelope.schemaVersion, 'Envelope schemaVersion');
		if (!envelope.keyId || !envelope.keyId.trim()) {
			return false;
		}

		const key = this.keysById.get(envelope.keyId);
		if (!key) {
			return false;
		}

		if (key.algorithm !== envelope.algorithm) {
			return false;
		}

		if (
			this.keyPolicy &&
			!this.keyPolicy.canVerify(key.id, {
				signedAt: envelope.signedAt,
			})
		) {
			return false;
		}

		try {
			return verifyStableValueSignature(envelope.payload, key.secret, envelope.signature, {
				algorithm: envelope.algorithm,
			});
		} catch {
			return false;
		}
	}
}
