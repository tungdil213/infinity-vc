import { EffectStack, type EffectResolutionOptions, type StackEffect } from '../effects/effect_stack.js';
import { validateDsl, type ValidationDslNode, type ValidationDslViolation } from '../validation/validation_dsl.js';

export interface ScriptedEffectRuntimeContext<
	TState,
	TContext extends object,
	TEffect extends ScriptedEffect<TState, TContext> = ScriptedEffect<TState, TContext>,
> {
	readonly state: TState;
	readonly context: TContext;
	readonly effect: TEffect;
}

export interface ScriptedEffect<TState, TContext extends object = Record<string, unknown>> extends StackEffect {
	readonly op: string;
	readonly args?: Record<string, unknown>;
	readonly when?: ValidationDslNode<ScriptedEffectRuntimeContext<TState, TContext, ScriptedEffect<TState, TContext>>>;
}

export interface ScriptedEffectHandlerInput<
	TState,
	TContext extends object,
	TEffect extends ScriptedEffect<TState, TContext>,
> {
	readonly state: TState;
	readonly context: TContext;
	readonly effect: TEffect;
}

export interface ScriptedEffectHandlerResult<
	TState,
	TContext extends object,
	TEvent,
	TEffect extends ScriptedEffect<TState, TContext>,
> {
	readonly state: TState;
	readonly events?: readonly TEvent[];
	readonly enqueue?: readonly TEffect[];
}

export type ScriptedEffectHandler<
	TState,
	TContext extends object,
	TEvent,
	TEffect extends ScriptedEffect<TState, TContext>,
> = (
	input: ScriptedEffectHandlerInput<TState, TContext, TEffect>
) => ScriptedEffectHandlerResult<TState, TContext, TEvent, TEffect>;

export interface ScriptedEffectSkip<TState, TContext extends object, TEffect extends ScriptedEffect<TState, TContext>> {
	readonly effect: TEffect;
	readonly reason: 'condition_not_met' | 'unknown_operation';
	readonly violations?: readonly ValidationDslViolation[];
}

export interface ScriptedEffectResolution<
	TState,
	TContext extends object,
	TEvent,
	TEffect extends ScriptedEffect<TState, TContext>,
> {
	readonly state: TState;
	readonly events: readonly TEvent[];
	readonly resolvedEffects: readonly TEffect[];
	readonly skippedEffects: readonly ScriptedEffectSkip<TState, TContext, TEffect>[];
}

export interface ScriptedEffectResolveOptions extends EffectResolutionOptions {
	readonly strictUnknownOperation?: boolean;
}

export class ScriptedEffectEngine<
	TState,
	TContext extends object,
	TEvent,
	TEffect extends ScriptedEffect<TState, TContext> = ScriptedEffect<TState, TContext>,
> {
	private readonly handlers = new Map<string, ScriptedEffectHandler<TState, TContext, TEvent, TEffect>>();

	constructor(handlers: Record<string, ScriptedEffectHandler<TState, TContext, TEvent, TEffect>> = {}) {
		for (const [operation, handler] of Object.entries(handlers)) {
			this.register(operation, handler);
		}
	}

	register(operation: string, handler: ScriptedEffectHandler<TState, TContext, TEvent, TEffect>): this {
		if (!operation.trim()) {
			throw new TypeError('Scripted effect operation cannot be empty');
		}

		this.handlers.set(operation, handler);
		return this;
	}

	resolve(
		initialState: TState,
		effects: readonly TEffect[],
		context: TContext,
		options: ScriptedEffectResolveOptions = {}
	): ScriptedEffectResolution<TState, TContext, TEvent, TEffect> {
		const strictUnknownOperation = options.strictUnknownOperation ?? true;
		const skippedEffects: ScriptedEffectSkip<TState, TContext, TEffect>[] = [];
		const stack = new EffectStack<TEffect>();
		stack.pushMany(effects);

		const resolution = stack.resolveAll(
			initialState,
			(state, effect) => {
				if (effect.when) {
					const runtimeContext = {
						state,
						context,
						effect,
					};
					const validation = validateDsl(effect.when, runtimeContext);
					if (!validation.valid) {
						skippedEffects.push({
							effect,
							reason: 'condition_not_met',
							violations: validation.violations,
						});

						return {
							state,
						};
					}
				}

				const handler = this.handlers.get(effect.op);
				if (!handler) {
					if (strictUnknownOperation) {
						throw new Error(`Unknown scripted effect operation: ${effect.op}`);
					}

					skippedEffects.push({
						effect,
						reason: 'unknown_operation',
					});

					return {
						state,
					};
				}

				return handler({
					state,
					context,
					effect,
				});
			},
			options
		);

		return {
			...resolution,
			skippedEffects,
		};
	}
}
