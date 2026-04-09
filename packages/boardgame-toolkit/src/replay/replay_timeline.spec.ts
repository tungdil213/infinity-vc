import { describe, expect, it } from 'vitest';
import { ReplayTimeline, ReplayTimelineBuilder } from './replay_timeline.js';

describe('ReplayTimeline', () => {
	it('builds timeline with synced state, logs and highlights', () => {
		const builder = new ReplayTimelineBuilder({ score: 0 }, (state, event: { type: 'add'; value: number }) => ({
			score: state.score + event.value,
		}));

		builder.append(
			{ type: 'add', value: 2 },
			{
				logs: ['p1 gains 2'],
				highlightIds: ['score-track'],
				durationMs: 450,
			}
		);

		builder.append(
			{ type: 'add', value: 1 },
			{
				logs: ['p1 gains 1'],
				highlightIds: ['score-track'],
				durationMs: 250,
			}
		);

		const timeline = builder.build();
		expect(timeline.stepCount).toBe(2);

		const first = timeline.next();
		expect(first?.state).toEqual({ score: 2 });
		expect(first?.logs).toEqual(['p1 gains 2']);
		expect(first?.highlightIds).toEqual(['score-track']);
		expect(first?.durationMs).toBe(450);

		const second = timeline.next();
		expect(second?.state).toEqual({ score: 3 });
		expect(timeline.next()).toBeNull();
	});

	it('supports seek/previous/reset navigation', () => {
		const timeline = new ReplayTimelineBuilder({ turn: 0 }, (state, event: { type: 'turn' }) => ({
			turn: state.turn + (event.type === 'turn' ? 1 : 0),
		}))
			.append({ type: 'turn' })
			.append({ type: 'turn' })
			.append({ type: 'turn' })
			.build();

		timeline.seek(1);
		expect(timeline.currentState()).toEqual({ turn: 2 });

		timeline.previous();
		expect(timeline.currentState()).toEqual({ turn: 1 });

		timeline.reset();
		expect(timeline.currentIndex()).toBe(-1);
		expect(timeline.currentState()).toEqual({ turn: 0 });
	});

	it('supports snapshot roundtrip', () => {
		const initial = new ReplayTimelineBuilder({ value: 1 }, (state, event: { type: 'mul'; value: number }) => ({
			value: state.value * event.value,
		}))
			.append({ type: 'mul', value: 2 }, { logs: ['x2'] })
			.append({ type: 'mul', value: 3 }, { logs: ['x3'] })
			.build();

		const snapshot = initial.toSnapshot();
		const replay = ReplayTimeline.fromSnapshot(snapshot);
		expect(replay.stepCount).toBe(2);
		replay.seek(1);
		expect(replay.currentState()).toEqual({ value: 6 });
	});
});
