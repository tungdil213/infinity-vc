import { stableJsonStringify } from '../serialization/stable_json.js';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry<TActorId extends string, TMetadata = unknown> {
	readonly id: number;
	readonly action: string;
	readonly actorId: TActorId;
	readonly targetType?: string;
	readonly targetId?: string;
	readonly sensitive: boolean;
	readonly severity: AuditSeverity;
	readonly schemaVersion: number;
	readonly metadata: TMetadata;
	readonly occurredAt: string;
}

export interface AuditAppendInput<TActorId extends string, TMetadata> {
	readonly action: string;
	readonly actorId: TActorId;
	readonly targetType?: string;
	readonly targetId?: string;
	readonly sensitive?: boolean;
	readonly severity?: AuditSeverity;
	readonly schemaVersion?: number;
	readonly metadata?: TMetadata;
	readonly occurredAt?: string;
}

export interface AuditTrailSnapshot<TActorId extends string> {
	readonly entries: readonly AuditEntry<TActorId>[];
	readonly sequence: number;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export class AuditTrail<TActorId extends string> {
	private readonly entries: AuditEntry<TActorId>[] = [];
	private sequence = 1;

	append<TMetadata = unknown>(input: AuditAppendInput<TActorId, TMetadata>): AuditEntry<TActorId, TMetadata> {
		if (!isNonEmptyString(input.action)) {
			throw new TypeError('Audit action is required');
		}

		if (!isNonEmptyString(input.actorId)) {
			throw new TypeError('Audit actorId is required');
		}

		const schemaVersion = input.schemaVersion ?? 1;
		if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
			throw new TypeError('Audit schemaVersion must be a positive integer');
		}

		const occurredAt = input.occurredAt ?? new Date().toISOString();
		if (!isNonEmptyString(occurredAt)) {
			throw new TypeError('Audit occurredAt is required');
		}

		const severity = input.severity ?? 'info';
		if (!['info', 'warning', 'critical'].includes(severity)) {
			throw new TypeError(`Unsupported audit severity: ${severity}`);
		}

		const entry: AuditEntry<TActorId, TMetadata> = {
			id: this.sequence,
			action: input.action,
			actorId: input.actorId,
			targetType: input.targetType,
			targetId: input.targetId,
			sensitive: input.sensitive ?? false,
			severity,
			schemaVersion,
			metadata: (input.metadata ?? {}) as TMetadata,
			occurredAt,
		};

		this.sequence += 1;
		this.entries.push(entry as AuditEntry<TActorId>);
		return entry;
	}

	appendSensitive<TMetadata = unknown>(
		input: Omit<AuditAppendInput<TActorId, TMetadata>, 'sensitive'>
	): AuditEntry<TActorId, TMetadata> {
		return this.append({
			...input,
			sensitive: true,
		});
	}

	listAll(): readonly AuditEntry<TActorId>[] {
		return [...this.entries];
	}

	listSensitive(): readonly AuditEntry<TActorId>[] {
		return this.entries.filter((entry) => entry.sensitive);
	}

	filterByActor(actorId: TActorId): readonly AuditEntry<TActorId>[] {
		return this.entries.filter((entry) => entry.actorId === actorId);
	}

	filterByAction(action: string): readonly AuditEntry<TActorId>[] {
		return this.entries.filter((entry) => entry.action === action);
	}

	toSnapshot(): AuditTrailSnapshot<TActorId> {
		return {
			entries: this.listAll(),
			sequence: this.sequence,
		};
	}

	toStableJson(): string {
		return stableJsonStringify({
			schemaVersion: 1,
			entries: this.entries,
		});
	}

	static fromSnapshot<TActorId extends string>(snapshot: AuditTrailSnapshot<TActorId>): AuditTrail<TActorId> {
		const audit = new AuditTrail<TActorId>();
		audit.entries.push(...snapshot.entries);
		audit.sequence = snapshot.sequence;
		return audit;
	}
}
