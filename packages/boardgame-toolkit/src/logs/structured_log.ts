import { stableJsonStringify } from '../serialization/stable_json.js';

export type LogLevel = 'info' | 'action' | 'warning' | 'error';

export type LogAudience<TPlayerId extends string> =
	| 'all'
	| { readonly players: readonly TPlayerId[] }
	| { readonly allExcept: readonly TPlayerId[] };

export interface StructuredLogEntry<TPlayerId extends string, TParams = unknown> {
	readonly id: number;
	readonly schemaVersion?: number;
	readonly key: string;
	readonly params: TParams;
	readonly audience: LogAudience<TPlayerId>;
	readonly level: LogLevel;
	readonly createdAt: string;
}

export interface StructuredLogSnapshot<TPlayerId extends string> {
	readonly entries: readonly StructuredLogEntry<TPlayerId>[];
	readonly sequence: number;
}

export interface StructuredLogAppendInput<TPlayerId extends string, TParams> {
	readonly key: string;
	readonly schemaVersion?: number;
	readonly params?: TParams;
	readonly audience?: LogAudience<TPlayerId>;
	readonly level?: LogLevel;
	readonly createdAt?: string;
}

export type LogRenderer<TParams = unknown> = (params: TParams) => string;

export class StructuredLog<TPlayerId extends string> {
	private readonly entries: StructuredLogEntry<TPlayerId>[] = [];
	private sequence = 1;

	append<TParams = unknown>(
		input: StructuredLogAppendInput<TPlayerId, TParams>
	): StructuredLogEntry<TPlayerId, TParams> {
		if (!input.key) {
			throw new TypeError('Structured log entries must define a key');
		}

		const createdAt = input.createdAt ?? new Date().toISOString();
		if (!createdAt) {
			throw new TypeError('Structured log timestamp must be non-empty');
		}

		const schemaVersion = input.schemaVersion ?? 1;
		if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
			throw new TypeError('Structured log schemaVersion must be a positive integer');
		}

		const entry: StructuredLogEntry<TPlayerId, TParams> = {
			id: this.sequence,
			schemaVersion,
			key: input.key,
			params: (input.params ?? {}) as TParams,
			audience: input.audience ?? 'all',
			level: input.level ?? 'info',
			createdAt,
		};

		this.sequence += 1;
		this.entries.push(entry as StructuredLogEntry<TPlayerId>);
		return entry;
	}

	listAll(): readonly StructuredLogEntry<TPlayerId>[] {
		return [...this.entries];
	}

	listForViewer(viewerId: TPlayerId | 'spectator' | 'omniscient'): readonly StructuredLogEntry<TPlayerId>[] {
		if (viewerId === 'omniscient') {
			return this.listAll();
		}

		return this.entries.filter((entry) => this.isVisibleToViewer(entry.audience, viewerId));
	}

	renderForViewer(
		viewerId: TPlayerId | 'spectator' | 'omniscient',
		renderers: Partial<Record<string, LogRenderer>>
	): readonly string[] {
		return this.listForViewer(viewerId).map((entry) => {
			const renderer = renderers[entry.key];
			if (!renderer) {
				return `${entry.key} ${JSON.stringify(entry.params)}`;
			}

			return renderer(entry.params);
		});
	}

	clear(): this {
		this.entries.length = 0;
		return this;
	}

	toSnapshot(): StructuredLogSnapshot<TPlayerId> {
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

	static fromSnapshot<TPlayerId extends string>(snapshot: StructuredLogSnapshot<TPlayerId>): StructuredLog<TPlayerId> {
		const log = new StructuredLog<TPlayerId>();
		log.sequence = snapshot.sequence;
		log.entries.push(...snapshot.entries);
		return log;
	}

	private isVisibleToViewer(audience: LogAudience<TPlayerId>, viewerId: TPlayerId | 'spectator'): boolean {
		if (audience === 'all') {
			return true;
		}

		if ('players' in audience) {
			return audience.players.includes(viewerId as TPlayerId);
		}

		return !audience.allExcept.includes(viewerId as TPlayerId);
	}
}
