import { createHmac, timingSafeEqual } from 'node:crypto';
import { stableJsonStringify } from './stable_json.js';

export type StableSignatureAlgorithm = 'sha256' | 'sha512';

export interface StableSignatureOptions {
	readonly algorithm?: StableSignatureAlgorithm;
	readonly prefixAlgorithm?: boolean;
}

const resolveAlgorithm = (value: string | undefined): StableSignatureAlgorithm => {
	if (!value || value === 'sha256') {
		return 'sha256';
	}

	if (value === 'sha512') {
		return 'sha512';
	}

	throw new TypeError(`Unsupported signature algorithm: ${value}`);
};

const assertSecret = (secret: string): void => {
	if (!secret || !secret.trim()) {
		throw new TypeError('Signature secret must be a non-empty string');
	}
};

const computeDigest = (value: unknown, secret: string, algorithm: StableSignatureAlgorithm): string => {
	return createHmac(algorithm, secret).update(stableJsonStringify(value)).digest('hex');
};

const splitSignature = (
	signature: string,
	defaultAlgorithm: StableSignatureAlgorithm
): {
	readonly algorithm: StableSignatureAlgorithm;
	readonly digest: string;
} => {
	const separatorIndex = signature.indexOf(':');
	if (separatorIndex < 0) {
		return {
			algorithm: defaultAlgorithm,
			digest: signature,
		};
	}

	const algorithm = resolveAlgorithm(signature.slice(0, separatorIndex));
	return {
		algorithm,
		digest: signature.slice(separatorIndex + 1),
	};
};

export const signStableValue = (value: unknown, secret: string, options: StableSignatureOptions = {}): string => {
	assertSecret(secret);
	const algorithm = resolveAlgorithm(options.algorithm);
	const digest = computeDigest(value, secret, algorithm);
	const prefixAlgorithm = options.prefixAlgorithm ?? true;
	return prefixAlgorithm ? `${algorithm}:${digest}` : digest;
};

export const verifyStableValueSignature = (
	value: unknown,
	secret: string,
	signature: string,
	options: StableSignatureOptions = {}
): boolean => {
	assertSecret(secret);
	if (!signature) {
		return false;
	}

	const defaultAlgorithm = resolveAlgorithm(options.algorithm);
	const parsed = splitSignature(signature, defaultAlgorithm);
	const expectedDigest = computeDigest(value, secret, parsed.algorithm);

	const expectedBuffer = Buffer.from(expectedDigest, 'hex');
	let providedBuffer: Buffer;
	try {
		providedBuffer = Buffer.from(parsed.digest, 'hex');
	} catch {
		return false;
	}

	if (expectedBuffer.length !== providedBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, providedBuffer);
};
