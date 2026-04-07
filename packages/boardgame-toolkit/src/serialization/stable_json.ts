const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

export const canonicalizeJsonValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => canonicalizeJsonValue(item));
	}

	if (!isPlainObject(value)) {
		return value;
	}

	const sortedKeys = Object.keys(value).sort((left, right) => left.localeCompare(right));
	const normalized: Record<string, unknown> = {};

	for (const key of sortedKeys) {
		normalized[key] = canonicalizeJsonValue(value[key]);
	}

	return normalized;
};

export const stableJsonStringify = (value: unknown): string => {
	return JSON.stringify(canonicalizeJsonValue(value));
};
