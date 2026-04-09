export interface StackEffect {
	readonly id: string;
	readonly priority?: number;
	readonly source?: string;
	readonly payload?: unknown;
}

export interface EffectHandlerResult<TState, TEffect extends StackEffect, TEvent> {
	readonly state: TState;
	readonly events?: readonly TEvent[];
	readonly enqueue?: readonly TEffect[];
}

export type EffectHandler<TState, TEffect extends StackEffect, TEvent> = (
	state: TState,
	effect: TEffect
) => EffectHandlerResult<TState, TEffect, TEvent>;

export interface EffectResolutionOptions {
	readonly maxSteps?: number;
}

export interface EffectResolution<TState, TEffect extends StackEffect, TEvent> {
	readonly state: TState;
	readonly events: readonly TEvent[];
	readonly resolvedEffects: readonly TEffect[];
}

interface StackEntry<TEffect extends StackEffect> {
	readonly effect: TEffect;
	readonly priority: number;
	readonly sequence: number;
}

const normalizePriority = (priority: number | undefined): number => {
	if (priority === undefined) {
		return 0;
	}

	if (!Number.isInteger(priority)) {
		throw new TypeError('Effect priority must be an integer');
	}

	return priority;
};

export class EffectStack<TEffect extends StackEffect> {
	private readonly queue: StackEntry<TEffect>[] = [];
	private sequence = 0;

	get size(): number {
		return this.queue.length;
	}

	clear(): this {
		this.queue.length = 0;
		return this;
	}

	push(effect: TEffect): this {
		this.queue.push({
			effect,
			priority: normalizePriority(effect.priority),
			sequence: this.sequence,
		});
		this.sequence += 1;
		return this;
	}

	pushMany(effects: readonly TEffect[]): this {
		for (const effect of effects) {
			this.push(effect);
		}

		return this;
	}

	resolveAll<TState, TEvent>(
		initialState: TState,
		handler: EffectHandler<TState, TEffect, TEvent>,
		options: EffectResolutionOptions = {}
	): EffectResolution<TState, TEffect, TEvent> {
		const maxSteps = options.maxSteps ?? 1000;
		if (!Number.isInteger(maxSteps) || maxSteps < 1) {
			throw new TypeError('Effect resolution maxSteps must be a positive integer');
		}

		let state = initialState;
		let steps = 0;
		const events: TEvent[] = [];
		const resolvedEffects: TEffect[] = [];

		while (this.queue.length > 0) {
			if (steps >= maxSteps) {
				throw new Error(`Effect resolution exceeded maxSteps (${maxSteps})`);
			}

			const current = this.popNext();
			resolvedEffects.push(current.effect);

			const result = handler(state, current.effect);
			state = result.state;

			if (result.events) {
				events.push(...result.events);
			}

			if (result.enqueue && result.enqueue.length > 0) {
				this.pushMany(result.enqueue);
			}

			steps += 1;
		}

		return {
			state,
			events,
			resolvedEffects,
		};
	}

	private popNext(): StackEntry<TEffect> {
		if (this.queue.length === 0) {
			throw new Error('Effect stack is empty');
		}

		let selectedIndex = 0;
		for (let index = 1; index < this.queue.length; index += 1) {
			const selected = this.queue[selectedIndex] as StackEntry<TEffect>;
			const candidate = this.queue[index] as StackEntry<TEffect>;

			if (candidate.priority > selected.priority) {
				selectedIndex = index;
				continue;
			}

			if (candidate.priority === selected.priority && candidate.sequence > selected.sequence) {
				selectedIndex = index;
			}
		}

		const [entry] = this.queue.splice(selectedIndex, 1);
		return entry as StackEntry<TEffect>;
	}
}
