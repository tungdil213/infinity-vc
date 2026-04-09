import { describe, expect, test } from 'vitest';
import { ActionQueue } from './action_queue.js';

describe('ActionQueue', () => {
	test('dispatches actions and supports undo/redo', () => {
		const queue = new ActionQueue({ value: 0 });

		queue.dispatch({
			type: 'increment',
			apply: (state) => ({ ...state, value: state.value + 1 }),
		});

		queue.dispatch({
			type: 'increment',
			apply: (state) => ({ ...state, value: state.value + 1 }),
		});

		expect(queue.getState().value).toBe(2);
		queue.undo();
		expect(queue.getState().value).toBe(1);
		queue.redo();
		expect(queue.getState().value).toBe(2);
	});
});
