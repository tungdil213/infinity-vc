export interface GameAction<TState> {
	readonly type: string;
	readonly apply: (state: TState) => TState;
}

export interface ActionHistoryEntry {
	readonly type: string;
	readonly timestamp: string;
}

interface ActionRecord<TState> {
	readonly action: GameAction<TState>;
	readonly previousState: TState;
	readonly nextState: TState;
	readonly timestamp: string;
}

const cloneState = <TState>(state: TState): TState => {
	if (typeof structuredClone === 'function') {
		return structuredClone(state);
	}

	return JSON.parse(JSON.stringify(state)) as TState;
};

export class ActionQueue<TState> {
	private state: TState;
	private past: ActionRecord<TState>[] = [];
	private future: ActionRecord<TState>[] = [];

	constructor(
		initialState: TState,
		private readonly clone: (state: TState) => TState = cloneState
	) {
		this.state = this.clone(initialState);
	}

	getState(): TState {
		return this.clone(this.state);
	}

	dispatch(action: GameAction<TState>): TState {
		const previousState = this.clone(this.state);
		const nextState = this.clone(action.apply(this.clone(this.state)));

		this.state = nextState;
		this.past.push({
			action,
			previousState,
			nextState,
			timestamp: new Date().toISOString(),
		});
		this.future = [];

		return this.getState();
	}

	undo(): TState | null {
		const record = this.past.pop();
		if (!record) {
			return null;
		}

		this.state = this.clone(record.previousState);
		this.future.unshift(record);
		return this.getState();
	}

	redo(): TState | null {
		const record = this.future.shift();
		if (!record) {
			return null;
		}

		this.state = this.clone(record.nextState);
		this.past.push(record);
		return this.getState();
	}

	getHistory(): readonly ActionHistoryEntry[] {
		return this.past.map((record) => ({
			type: record.action.type,
			timestamp: record.timestamp,
		}));
	}
}
