export type KeyLifecycleStatus = 'active' | 'deprecated' | 'revoked';

export interface KeyLifecycleWindow {
	readonly notBefore?: string;
	readonly notAfter?: string;
}

export interface KeyLifecycleRule {
	readonly keyId: string;
	readonly status?: KeyLifecycleStatus;
	readonly signWindow?: KeyLifecycleWindow;
	readonly verifyWindow?: KeyLifecycleWindow;
}

export interface KeyVerifyContext {
	readonly signedAt?: string;
	readonly verifiedAt?: string;
}

interface NormalizedKeyLifecycleRule {
	readonly keyId: string;
	readonly status: KeyLifecycleStatus;
	readonly signWindow?: KeyLifecycleWindow;
	readonly verifyWindow?: KeyLifecycleWindow;
}

const isValidTimestamp = (value: string | undefined): boolean => {
	if (!value) {
		return true;
	}

	return !Number.isNaN(Date.parse(value));
};

const assertWindow = (window: KeyLifecycleWindow | undefined, label: string): void => {
	if (!window) {
		return;
	}

	if (!isValidTimestamp(window.notBefore) || !isValidTimestamp(window.notAfter)) {
		throw new TypeError(`${label} must use valid ISO timestamps`);
	}

	if (window.notBefore && window.notAfter && Date.parse(window.notBefore) > Date.parse(window.notAfter)) {
		throw new TypeError(`${label} notBefore must be <= notAfter`);
	}
};

const withinWindow = (timestamp: string, window: KeyLifecycleWindow | undefined): boolean => {
	if (!window) {
		return true;
	}

	const value = Date.parse(timestamp);
	if (Number.isNaN(value)) {
		return false;
	}

	if (window.notBefore && value < Date.parse(window.notBefore)) {
		return false;
	}

	if (window.notAfter && value > Date.parse(window.notAfter)) {
		return false;
	}

	return true;
};

export class KeyRingPolicy {
	private readonly rulesByKeyId = new Map<string, NormalizedKeyLifecycleRule>();

	constructor(rules: readonly KeyLifecycleRule[]) {
		for (const rule of rules) {
			this.addRule(rule);
		}
	}

	addRule(rule: KeyLifecycleRule): this {
		if (!rule.keyId || !rule.keyId.trim()) {
			throw new TypeError('Policy keyId is required');
		}

		const status = rule.status ?? 'active';
		if (!['active', 'deprecated', 'revoked'].includes(status)) {
			throw new TypeError(`Unsupported key lifecycle status: ${status}`);
		}

		assertWindow(rule.signWindow, `signWindow for ${rule.keyId}`);
		assertWindow(rule.verifyWindow, `verifyWindow for ${rule.keyId}`);

		this.rulesByKeyId.set(rule.keyId, {
			keyId: rule.keyId,
			status,
			signWindow: rule.signWindow,
			verifyWindow: rule.verifyWindow,
		});

		return this;
	}

	canSign(keyId: string, signedAt: string = new Date().toISOString()): boolean {
		const rule = this.rulesByKeyId.get(keyId);
		if (!rule) {
			return true;
		}

		if (!isValidTimestamp(signedAt)) {
			return false;
		}

		if (rule.status !== 'active') {
			return false;
		}

		return withinWindow(signedAt, rule.signWindow);
	}

	canVerify(keyId: string, context: KeyVerifyContext = {}): boolean {
		const rule = this.rulesByKeyId.get(keyId);
		if (!rule) {
			return true;
		}

		if (rule.status === 'revoked') {
			return false;
		}

		const verifiedAt = context.verifiedAt ?? new Date().toISOString();
		if (!isValidTimestamp(verifiedAt) || !withinWindow(verifiedAt, rule.verifyWindow)) {
			return false;
		}

		if (context.signedAt) {
			if (!isValidTimestamp(context.signedAt)) {
				return false;
			}

			if (!withinWindow(context.signedAt, rule.signWindow)) {
				return false;
			}
		}

		return true;
	}

	getStatus(keyId: string): KeyLifecycleStatus | null {
		return this.rulesByKeyId.get(keyId)?.status ?? null;
	}
}
