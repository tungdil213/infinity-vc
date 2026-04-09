import { describe, expect, it } from 'vitest';
import { EffectStack } from './effect_stack.js';

interface TestEffect {
	readonly id: string;
	readonly priority?: number;
	readonly value: number;
	readonly spawn?: boolean;
}

describe('EffectStack', () => {
	it('resolves effects by priority then LIFO within same priority', () => {
		const stack = new EffectStack<TestEffect>();
		stack.push({ id: 'a', priority: 0, value: 1 });
		stack.push({ id: 'b', priority: 2, value: 2 });
		stack.push({ id: 'c', priority: 2, value: 3 });
		stack.push({ id: 'd', priority: 1, value: 4 });

		const result = stack.resolveAll(0, (state, effect) => ({
			state: state + effect.value,
			events: [effect.id],
		}));

		expect(result.events).toEqual(['c', 'b', 'd', 'a']);
		expect(result.state).toBe(10);
	});

	it('supports spawned effects during resolution', () => {
		const stack = new EffectStack<TestEffect>();
		stack.push({ id: 'root', value: 2, spawn: true });

		const result = stack.resolveAll(0, (state, effect) => {
			if (effect.spawn) {
				return {
					state: state + effect.value,
					enqueue: [
						{ id: 'child-1', value: 3, priority: 1 },
						{ id: 'child-2', value: 4, priority: 1 },
					],
				};
			}

			return {
				state: state + effect.value,
				events: [effect.id],
			};
		});

		expect(result.state).toBe(9);
		expect(result.events).toEqual(['child-2', 'child-1']);
		expect(result.resolvedEffects.map((effect) => effect.id)).toEqual(['root', 'child-2', 'child-1']);
	});

	it('stops on maxSteps overflow', () => {
		const stack = new EffectStack<TestEffect>();
		stack.push({ id: 'loop', value: 0, spawn: true });

		expect(() =>
			stack.resolveAll(
				0,
				(state, effect) => ({
					state,
					enqueue: effect.spawn ? [{ id: 'loop', value: 0, spawn: true }] : [],
				}),
				{ maxSteps: 10 }
			)
		).toThrow('maxSteps');
	});
});
