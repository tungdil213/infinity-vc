export interface PipelineEvent<TType extends string = string, TPayload = unknown> {
	readonly type: TType;
	readonly payload?: TPayload;
	readonly actorId?: string;
	readonly timestamp?: string;
}

export interface EventPipelineRuleContext<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TSourceEvent extends PipelineEvent,
> {
	readonly state: TState;
	readonly context: TContext;
	readonly event: TEvent;
	readonly sourceEvent: TSourceEvent;
}

export interface EventPipelineBaseRule<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TSourceEvent extends PipelineEvent,
> {
	readonly id: string;
	readonly priority?: number;
	readonly eventTypes?: readonly TEvent['type'][] | '*';
	readonly when?: (context: EventPipelineRuleContext<TState, TContext, TEvent, TSourceEvent>) => boolean;
}

export interface EventReplacementRule<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TSourceEvent extends PipelineEvent = TEvent,
> extends EventPipelineBaseRule<TState, TContext, TEvent, TSourceEvent> {
	readonly replace: (context: EventPipelineRuleContext<TState, TContext, TEvent, TSourceEvent>) => readonly TEvent[];
}

export interface EventPreventionRule<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TSourceEvent extends PipelineEvent = TEvent,
> extends EventPipelineBaseRule<TState, TContext, TEvent, TSourceEvent> {
	readonly reason?: string;
	readonly prevent: (context: EventPipelineRuleContext<TState, TContext, TEvent, TSourceEvent>) => boolean;
}

export interface EventTriggerRule<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TEffect,
	TSourceEvent extends PipelineEvent = TEvent,
> extends EventPipelineBaseRule<TState, TContext, TEvent, TSourceEvent> {
	readonly produceEffects: (
		context: EventPipelineRuleContext<TState, TContext, TEvent, TSourceEvent>
	) => readonly TEffect[];
}

export interface EventPipelinePreventedEvent<TEvent extends PipelineEvent> {
	readonly event: TEvent;
	readonly preventedByRuleId: string;
	readonly reason?: string;
}

export interface EventPipelineOptions {
	readonly maxReplacementDepth?: number;
}

export interface EventPipelineResult<
	TEvent extends PipelineEvent,
	TEffect,
	TSourceEvent extends PipelineEvent = TEvent,
> {
	readonly sourceEvent: TSourceEvent;
	readonly emittedEvents: readonly TEvent[];
	readonly preventedEvents: readonly EventPipelinePreventedEvent<TEvent>[];
	readonly effects: readonly TEffect[];
}

const normalizePriority = (priority: number | undefined): number => {
	if (priority === undefined) {
		return 0;
	}

	if (!Number.isInteger(priority)) {
		throw new TypeError('Rule priority must be an integer');
	}

	return priority;
};

const assertRuleId = (ruleId: string): void => {
	if (!ruleId.trim()) {
		throw new TypeError('Rule id is required');
	}
};

const sortRulesByPriority = <TRule extends { readonly priority?: number }>(rules: readonly TRule[]): TRule[] => {
	return [...rules].sort((left, right) => normalizePriority(right.priority) - normalizePriority(left.priority));
};

const matchesType = <TEvent extends PipelineEvent>(
	event: TEvent,
	eventTypes: readonly TEvent['type'][] | '*' | undefined
): boolean => {
	if (!eventTypes || eventTypes === '*') {
		return true;
	}

	return eventTypes.includes(event.type);
};

export class EventPipeline<
	TState,
	TContext extends object,
	TEvent extends PipelineEvent,
	TEffect,
	TSourceEvent extends PipelineEvent = TEvent,
> {
	private readonly replacementRules: EventReplacementRule<TState, TContext, TEvent, TSourceEvent>[] = [];
	private readonly preventionRules: EventPreventionRule<TState, TContext, TEvent, TSourceEvent>[] = [];
	private readonly triggerRules: EventTriggerRule<TState, TContext, TEvent, TEffect, TSourceEvent>[] = [];
	private readonly maxReplacementDepth: number;

	constructor(options: EventPipelineOptions = {}) {
		this.maxReplacementDepth = options.maxReplacementDepth ?? 20;
		if (!Number.isInteger(this.maxReplacementDepth) || this.maxReplacementDepth < 1) {
			throw new TypeError('maxReplacementDepth must be a positive integer');
		}
	}

	addReplacementRule(rule: EventReplacementRule<TState, TContext, TEvent, TSourceEvent>): this {
		assertRuleId(rule.id);
		this.replacementRules.push(rule);
		return this;
	}

	addPreventionRule(rule: EventPreventionRule<TState, TContext, TEvent, TSourceEvent>): this {
		assertRuleId(rule.id);
		this.preventionRules.push(rule);
		return this;
	}

	addTriggerRule(rule: EventTriggerRule<TState, TContext, TEvent, TEffect, TSourceEvent>): this {
		assertRuleId(rule.id);
		this.triggerRules.push(rule);
		return this;
	}

	process(
		sourceEvent: TSourceEvent,
		state: TState,
		context: TContext
	): EventPipelineResult<TEvent, TEffect, TSourceEvent> {
		const emittedEvents: TEvent[] = [];
		const preventedEvents: EventPipelinePreventedEvent<TEvent>[] = [];
		const effects: TEffect[] = [];

		const replacedEvents = this.applyReplacementRules(sourceEvent as unknown as TEvent, sourceEvent, state, context, 0);
		const preventionRules = sortRulesByPriority(this.preventionRules);
		const triggerRules = sortRulesByPriority(this.triggerRules);

		for (const event of replacedEvents) {
			const preventedBy = preventionRules.find((rule) =>
				this.evaluateRulePredicate(rule, sourceEvent, event, state, context, rule.prevent)
			);

			if (preventedBy) {
				preventedEvents.push({
					event,
					preventedByRuleId: preventedBy.id,
					reason: preventedBy.reason,
				});
				continue;
			}

			emittedEvents.push(event);

			for (const rule of triggerRules) {
				if (!matchesType(event, rule.eventTypes)) {
					continue;
				}

				if (rule.when && !rule.when({ state, context, event, sourceEvent })) {
					continue;
				}

				const producedEffects = rule.produceEffects({
					state,
					context,
					event,
					sourceEvent,
				});

				effects.push(...producedEffects);
			}
		}

		return {
			sourceEvent,
			emittedEvents,
			preventedEvents,
			effects,
		};
	}

	private applyReplacementRules(
		event: TEvent,
		sourceEvent: TSourceEvent,
		state: TState,
		context: TContext,
		depth: number
	): readonly TEvent[] {
		if (depth > this.maxReplacementDepth) {
			throw new Error(`Replacement depth exceeded maxReplacementDepth (${this.maxReplacementDepth})`);
		}

		const replacementRules = sortRulesByPriority(this.replacementRules);
		const matchingRule = replacementRules.find((rule) =>
			this.evaluateRulePredicate(rule, sourceEvent, event, state, context, () => true)
		);

		if (!matchingRule) {
			return [event];
		}

		const replacements = matchingRule.replace({
			state,
			context,
			event,
			sourceEvent,
		});

		const expandedEvents: TEvent[] = [];
		for (const replacement of replacements) {
			expandedEvents.push(...this.applyReplacementRules(replacement, sourceEvent, state, context, depth + 1));
		}

		return expandedEvents;
	}

	private evaluateRulePredicate<TRule extends EventPipelineBaseRule<TState, TContext, TEvent, TSourceEvent>>(
		rule: TRule,
		sourceEvent: TSourceEvent,
		event: TEvent,
		state: TState,
		context: TContext,
		predicate: (context: EventPipelineRuleContext<TState, TContext, TEvent, TSourceEvent>) => boolean
	): boolean {
		if (!matchesType(event, rule.eventTypes)) {
			return false;
		}

		const ruleContext = {
			state,
			context,
			event,
			sourceEvent,
		};

		if (rule.when && !rule.when(ruleContext)) {
			return false;
		}

		return predicate(ruleContext);
	}
}
