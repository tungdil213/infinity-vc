import { describe, expect, it } from 'vitest';
import { EventPipeline, type PipelineEvent } from './event_pipeline.js';

type GameEventType = 'damage' | 'damage_blocked' | 'draw_card' | 'energy_changed';

interface GameEvent extends PipelineEvent<GameEventType, Record<string, unknown>> {}

interface State {
	readonly shieldedPlayerIds: readonly string[];
	readonly handSizeByPlayer: Record<string, number>;
	readonly handLimit: number;
}

interface Context {
	readonly turn: number;
}

interface Effect {
	readonly id: string;
	readonly op: string;
	readonly args?: Record<string, unknown>;
}

describe('EventPipeline', () => {
	it('applies replacement before triggers', () => {
		const pipeline = new EventPipeline<State, Context, GameEvent, Effect>();

		pipeline.addReplacementRule({
			id: 'replace.damage.with.block',
			priority: 10,
			eventTypes: ['damage'],
			when: ({ state, event }) => {
				const targetId = event.payload?.targetId;
				return typeof targetId === 'string' && state.shieldedPlayerIds.includes(targetId);
			},
			replace: ({ event }) => [
				{
					type: 'damage_blocked',
					payload: event.payload,
				},
			],
		});

		pipeline.addTriggerRule({
			id: 'trigger.blocked.energy',
			eventTypes: ['damage_blocked'],
			produceEffects: ({ event }) => [
				{
					id: `fx:${event.type}`,
					op: 'gain',
					args: { amount: 1 },
				},
			],
		});

		const result = pipeline.process(
			{
				type: 'damage',
				payload: { targetId: 'alice', amount: 2 },
			},
			{
				shieldedPlayerIds: ['alice'],
				handSizeByPlayer: {},
				handLimit: 5,
			},
			{ turn: 1 }
		);

		expect(result.emittedEvents.map((event) => event.type)).toEqual(['damage_blocked']);
		expect(result.effects.map((effect) => effect.op)).toEqual(['gain']);
	});

	it('prevents events and blocks triggers for prevented events', () => {
		const pipeline = new EventPipeline<State, Context, GameEvent, Effect>();

		pipeline.addPreventionRule({
			id: 'prevent.draw.hand_full',
			eventTypes: ['draw_card'],
			prevent: ({ state, event }) => {
				const playerId = event.payload?.playerId;
				if (typeof playerId !== 'string') {
					return false;
				}

				return (state.handSizeByPlayer[playerId] ?? 0) >= state.handLimit;
			},
			reason: 'hand_limit_reached',
		});

		pipeline.addTriggerRule({
			id: 'trigger.draw.energy',
			eventTypes: ['draw_card'],
			produceEffects: () => [{ id: 'fx:draw', op: 'gain', args: { amount: 1 } }],
		});

		const result = pipeline.process(
			{
				type: 'draw_card',
				payload: { playerId: 'alice' },
			},
			{
				shieldedPlayerIds: [],
				handSizeByPlayer: { alice: 5 },
				handLimit: 5,
			},
			{ turn: 1 }
		);

		expect(result.emittedEvents).toEqual([]);
		expect(result.effects).toEqual([]);
		expect(result.preventedEvents[0]?.preventedByRuleId).toBe('prevent.draw.hand_full');
		expect(result.preventedEvents[0]?.reason).toBe('hand_limit_reached');
	});

	it('uses priority for conflicting replacements', () => {
		const pipeline = new EventPipeline<State, Context, GameEvent, Effect>();

		pipeline.addReplacementRule({
			id: 'replace.damage.low',
			priority: 1,
			eventTypes: ['damage'],
			replace: ({ event }) => [{ type: 'damage_blocked', payload: { ...event.payload, by: 'low' } }],
		});

		pipeline.addReplacementRule({
			id: 'replace.damage.high',
			priority: 10,
			eventTypes: ['damage'],
			replace: ({ event }) => [{ type: 'damage_blocked', payload: { ...event.payload, by: 'high' } }],
		});

		const result = pipeline.process(
			{
				type: 'damage',
				payload: { targetId: 'alice' },
			},
			{
				shieldedPlayerIds: ['alice'],
				handSizeByPlayer: {},
				handLimit: 5,
			},
			{ turn: 2 }
		);

		expect(result.emittedEvents[0]?.payload?.by).toBe('high');
	});

	it('protects against replacement loops', () => {
		const pipeline = new EventPipeline<State, Context, GameEvent, Effect>({
			maxReplacementDepth: 3,
		});

		pipeline.addReplacementRule({
			id: 'replace.loop',
			eventTypes: ['energy_changed'],
			replace: () => [{ type: 'energy_changed', payload: { loop: true } }],
		});

		expect(() =>
			pipeline.process(
				{ type: 'energy_changed', payload: {} },
				{
					shieldedPlayerIds: [],
					handSizeByPlayer: {},
					handLimit: 5,
				},
				{ turn: 3 }
			)
		).toThrow('maxReplacementDepth');
	});
});
