import { describe, expect, it } from 'vitest';
import { dslRule } from '../validation/validation_dsl.js';
import { ScriptedEffectEngine, type ScriptedEffect } from './scripted_effect_engine.js';

interface State {
	readonly energy: number;
}

interface Context {
	readonly actorId: string;
}

interface Event {
	readonly type: string;
	readonly payload?: unknown;
}

type Effect = ScriptedEffect<State, Context> & {
	readonly args?: {
		readonly amount?: number;
	};
};

describe('ScriptedEffectEngine', () => {
	it('resolves scripted effects and supports chained enqueue', () => {
		const engine = new ScriptedEffectEngine<State, Context, Event, Effect>({
			gain: ({ state, effect }) => {
				const amount = effect.args?.amount ?? 0;
				return {
					state: { energy: state.energy + amount },
					events: [{ type: 'gain', payload: amount }],
				};
			},
			boost: ({ state }) => {
				return {
					state,
					events: [{ type: 'boost' }],
					enqueue: [
						{
							id: 'gain-after-boost',
							op: 'gain',
							args: { amount: 2 },
							priority: 0,
						},
					],
				};
			},
		});

		const result = engine.resolve(
			{ energy: 1 },
			[
				{ id: 'gain-1', op: 'gain', args: { amount: 1 }, priority: 0 },
				{ id: 'boost', op: 'boost', priority: 1 },
			],
			{ actorId: 'alice' }
		);

		expect(result.state.energy).toBe(4);
		expect(result.events.map((event) => event.type)).toEqual(['boost', 'gain', 'gain']);
		expect(result.skippedEffects).toEqual([]);
	});

	it('skips effect when DSL condition fails', () => {
		const engine = new ScriptedEffectEngine<State, Context, Event, Effect>({
			spend: ({ state, effect }) => {
				const amount = effect.args?.amount ?? 0;
				return {
					state: { energy: state.energy - amount },
					events: [{ type: 'spend', payload: amount }],
				};
			},
		});

		const result = engine.resolve(
			{ energy: 1 },
			[
				{
					id: 'spend-3',
					op: 'spend',
					args: { amount: 3 },
					when: dslRule((context: { state: State }) => context.state.energy >= 3, {
						code: 'energy.low',
						message: 'Not enough energy',
					}),
				},
			],
			{ actorId: 'alice' }
		);

		expect(result.state.energy).toBe(1);
		expect(result.events).toEqual([]);
		expect(result.skippedEffects[0]?.reason).toBe('condition_not_met');
		expect(result.skippedEffects[0]?.violations?.[0]?.code).toBe('energy.low');
	});

	it('supports non-strict unknown operation mode', () => {
		const engine = new ScriptedEffectEngine<State, Context, Event, Effect>();

		const result = engine.resolve(
			{ energy: 2 },
			[{ id: 'unknown', op: 'teleport' }],
			{ actorId: 'alice' },
			{ strictUnknownOperation: false }
		);

		expect(result.state.energy).toBe(2);
		expect(result.skippedEffects[0]?.reason).toBe('unknown_operation');
	});

	it('throws on unknown operation in strict mode', () => {
		const engine = new ScriptedEffectEngine<State, Context, Event, Effect>();

		expect(() => engine.resolve({ energy: 2 }, [{ id: 'unknown', op: 'teleport' }], { actorId: 'alice' })).toThrow(
			'Unknown scripted effect operation'
		);
	});
});
