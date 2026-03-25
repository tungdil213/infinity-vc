export interface ReplayTimelineStep<TState, TEvent, TLog> {
	readonly index: number;
	readonly event: TEvent;
	readonly state: TState;
	readonly logs: readonly TLog[];
	readonly highlightIds: readonly string[];
	readonly durationMs: number;
}

export interface ReplayTimelineSnapshot<TState, TEvent, TLog> {
	readonly initialState: TState;
	readonly steps: readonly ReplayTimelineStep<TState, TEvent, TLog>[];
}

export interface ReplayAppendOptions<TLog> {
	readonly logs?: readonly TLog[];
	readonly highlightIds?: readonly string[];
	readonly durationMs?: number;
}

export class ReplayTimeline<TState, TEvent, TLog> {
	private pointer = -1;

	constructor(
		private readonly initialState: TState,
		private readonly steps: ReplayTimelineStep<TState, TEvent, TLog>[]
	) {}

	get stepCount(): number {
		return this.steps.length;
	}

	currentIndex(): number {
		return this.pointer;
	}

	currentStep(): ReplayTimelineStep<TState, TEvent, TLog> | null {
		if (this.pointer < 0 || this.pointer >= this.steps.length) {
			return null;
		}

		return this.steps[this.pointer] as ReplayTimelineStep<TState, TEvent, TLog>;
	}

	currentState(): TState {
		const step = this.currentStep();
		if (!step) {
			return this.initialState;
		}

		return step.state;
	}

	next(): ReplayTimelineStep<TState, TEvent, TLog> | null {
		if (this.pointer >= this.steps.length - 1) {
			return null;
		}

		this.pointer += 1;
		return this.currentStep();
	}

	previous(): ReplayTimelineStep<TState, TEvent, TLog> | null {
		if (this.pointer < 0) {
			return null;
		}

		this.pointer -= 1;
		return this.currentStep();
	}

	seek(index: number): ReplayTimelineStep<TState, TEvent, TLog> | null {
		if (!Number.isInteger(index)) {
			throw new TypeError('Replay seek index must be an integer');
		}

		if (index < -1 || index >= this.steps.length) {
			throw new RangeError(`Replay seek index ${index} is out of bounds`);
		}

		this.pointer = index;
		return this.currentStep();
	}

	reset(): this {
		this.pointer = -1;
		return this;
	}

	listSteps(): readonly ReplayTimelineStep<TState, TEvent, TLog>[] {
		return [...this.steps];
	}

	toSnapshot(): ReplayTimelineSnapshot<TState, TEvent, TLog> {
		return {
			initialState: this.initialState,
			steps: this.listSteps(),
		};
	}

	static fromSnapshot<TState, TEvent, TLog>(
		snapshot: ReplayTimelineSnapshot<TState, TEvent, TLog>
	): ReplayTimeline<TState, TEvent, TLog> {
		return new ReplayTimeline(snapshot.initialState, [...snapshot.steps]);
	}
}

export class ReplayTimelineBuilder<TState, TEvent, TLog> {
	private readonly steps: ReplayTimelineStep<TState, TEvent, TLog>[] = [];
	private state: TState;

	constructor(
		private readonly initialState: TState,
		private readonly reducer: (state: TState, event: TEvent) => TState
	) {
		this.state = initialState;
	}

	append(event: TEvent, options: ReplayAppendOptions<TLog> = {}): this {
		const durationMs = options.durationMs ?? 300;
		if (!Number.isInteger(durationMs) || durationMs < 0) {
			throw new TypeError('Replay step duration must be a non-negative integer');
		}

		this.state = this.reducer(this.state, event);

		const step: ReplayTimelineStep<TState, TEvent, TLog> = {
			index: this.steps.length,
			event,
			state: this.state,
			logs: options.logs ?? [],
			highlightIds: options.highlightIds ?? [],
			durationMs,
		};

		this.steps.push(step);
		return this;
	}

	appendMany(events: readonly TEvent[], options: ReplayAppendOptions<TLog> = {}): this {
		for (const event of events) {
			this.append(event, options);
		}

		return this;
	}

	build(): ReplayTimeline<TState, TEvent, TLog> {
		return new ReplayTimeline(this.initialState, [...this.steps]);
	}
}
