import { stableJsonStringify } from '../serialization/stable_json.js';

export interface MatchEvent<TPayload = unknown> {
	readonly id?: number;
	readonly type: string;
	readonly payload: TPayload;
	readonly actorId?: string;
	readonly schemaVersion?: number;
	readonly timestamp: string;
}

export interface MatchEventLogSnapshot {
	readonly events: readonly MatchEvent[];
	readonly sequence: number;
}

type NormalizedMatchEvent<TPayload> = MatchEvent<TPayload> & {
	id: number;
	schemaVersion: number;
};

export class MatchEventLog {
	private readonly events: MatchEvent[] = [];
	private sequence = 1;

	append<TPayload>(
		event: Omit<MatchEvent<TPayload>, 'id' | 'schemaVersion' | 'timestamp'> & {
			readonly id?: number;
			readonly schemaVersion?: number;
			readonly timestamp?: string;
		}
	): MatchEvent<TPayload> {
		const normalized: NormalizedMatchEvent<TPayload> = {
			id: event.id ?? this.sequence,
			...event,
			schemaVersion: event.schemaVersion ?? 1,
			timestamp: event.timestamp ?? new Date().toISOString(),
		};

		if (!normalized.type) {
			throw new TypeError('Match event type is required');
		}

		if (!Number.isInteger(normalized.id) || normalized.id < 1) {
			(normalized as NormalizedMatchEvent<TPayload>).id = this.sequence;
		}

		if (!Number.isInteger(normalized.schemaVersion) || normalized.schemaVersion < 1) {
			throw new TypeError('Match event schemaVersion must be a positive integer');
		}

		this.sequence = Math.max(this.sequence, normalized.id + 1);
		this.events.push(normalized as MatchEvent);
		return normalized;
	}

	getAll(): readonly MatchEvent[] {
		return [...this.events];
	}

	filterByType<TPayload = unknown>(type: string): MatchEvent<TPayload>[] {
		return this.events.filter((event) => event.type === type) as MatchEvent<TPayload>[];
	}

	replay<TState>(initialState: TState, reducer: (state: TState, event: MatchEvent) => TState): TState {
		return this.events.reduce((state, event) => reducer(state, event), initialState);
	}

	clear(): this {
		this.events.length = 0;
		return this;
	}

	toSnapshot(): MatchEventLogSnapshot {
		return {
			events: this.getAll(),
			sequence: this.sequence,
		};
	}

	toStableJson(): string {
		return stableJsonStringify({
			schemaVersion: 1,
			events: this.events,
		});
	}

	static fromSnapshot(snapshot: MatchEventLogSnapshot): MatchEventLog {
		const log = new MatchEventLog();
		log.events.push(...snapshot.events);
		log.sequence = snapshot.sequence;
		return log;
	}
}
