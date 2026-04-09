import { describe, expect, test } from 'vitest';
import { PhaseManager } from './phase_manager.js';

const phases = [
	{ id: 'setup', next: ['draft'] },
	{ id: 'draft', next: ['main'] },
	{ id: 'main', next: ['cleanup'] },
	{ id: 'cleanup', next: ['main', 'end'] },
	{ id: 'end', next: [] },
] as const;

describe('PhaseManager', () => {
	test('transitions only to allowed phases', () => {
		const manager = new PhaseManager(phases, 'setup');

		manager.transitionTo('draft').transitionTo('main').transitionTo('cleanup');
		expect(manager.getCurrentPhase()).toBe('cleanup');
		expect(manager.canTransitionTo('end')).toBe(true);
		expect(manager.canTransitionTo('draft')).toBe(false);
	});

	test('tracks history and supports reset', () => {
		const manager = new PhaseManager(phases, 'setup');
		manager.transitionTo('draft');

		expect(manager.getHistory()).toEqual(['setup', 'draft']);
		manager.reset();
		expect(manager.getHistory()).toEqual(['setup']);
	});
});
