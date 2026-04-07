import { describe, expect, test } from 'vitest';
import { MatchEventLog } from './event_log.js';

describe('MatchEventLog', () => {
	test('appends and filters events', () => {
		const log = new MatchEventLog();

		log.append({ type: 'coin.gain', payload: { amount: 3 }, actorId: 'p1' });
		log.append({ type: 'coin.spend', payload: { amount: 1 }, actorId: 'p1' });

		expect(log.getAll()).toHaveLength(2);
		expect(log.filterByType('coin.gain')).toHaveLength(1);
		expect(log.getAll()[0]?.id).toBe(1);
		expect(log.getAll()[0]?.schemaVersion).toBe(1);
	});

	test('replays events through reducer', () => {
		const log = new MatchEventLog();
		log.append({ type: 'inc', payload: { value: 2 } });
		log.append({ type: 'inc', payload: { value: 1 } });

		const final = log.replay({ score: 0 }, (state, event) => {
			if (event.type !== 'inc') {
				return state;
			}

			return {
				...state,
				score: state.score + Number((event.payload as { value: number }).value ?? 0),
			};
		});

		expect(final.score).toBe(3);
	});

	test('supports snapshot roundtrip and stable serialization', () => {
		const left = new MatchEventLog();
		const right = new MatchEventLog();

		left.append({
			type: 'state.patch',
			payload: { z: 1, a: { y: 2, x: 1 } },
			timestamp: '2026-01-01T00:00:00.000Z',
		});

		right.append({
			type: 'state.patch',
			payload: { a: { x: 1, y: 2 }, z: 1 },
			timestamp: '2026-01-01T00:00:00.000Z',
		});

		expect(left.toStableJson()).toBe(right.toStableJson());

		const restored = MatchEventLog.fromSnapshot(left.toSnapshot());
		expect(restored.getAll()).toEqual(left.getAll());
	});
});
