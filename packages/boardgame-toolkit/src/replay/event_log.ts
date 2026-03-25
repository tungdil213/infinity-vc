export interface MatchEvent<TPayload = unknown> {
	readonly type: string;
	readonly payload: TPayload;
	readonly actorId?: string;
	readonly timestamp: string;
}

export class MatchEventLog {
	private readonly events: MatchEvent[] = [];

	append<TPayload>(event: Omit<MatchEvent<TPayload>, 'timestamp'> & { timestamp?: string }): MatchEvent<TPayload> {
		const normalized: MatchEvent<TPayload> = {
			...event,
			timestamp: event.timestamp ?? new Date().toISOString(),
		};

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
}
