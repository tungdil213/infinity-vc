import { describe, expect, it } from 'vitest';
import { RotatingDraft } from './rotating_draft.js';

describe('RotatingDraft', () => {
	it('resolves picks and rotates remaining hands', () => {
		const draft = new RotatingDraft(
			{
				p1: ['A1', 'A2'],
				p2: ['B1', 'B2'],
				p3: ['C1', 'C2'],
			},
			{ direction: 'left' }
		);

		draft.pick('p1', 'A1');
		draft.pick('p2', 'B1');
		draft.pick('p3', 'C1');

		draft.resolveRound();

		expect(draft.draftedCards('p1')).toEqual(['A1']);
		expect(draft.draftedCards('p2')).toEqual(['B1']);
		expect(draft.draftedCards('p3')).toEqual(['C1']);

		expect(draft.hand('p1')).toEqual(['B2']);
		expect(draft.hand('p2')).toEqual(['C2']);
		expect(draft.hand('p3')).toEqual(['A2']);
	});

	it('requires one pick per active player before resolving', () => {
		const draft = new RotatingDraft({
			p1: ['A1', 'A2'],
			p2: ['B1', 'B2'],
		});

		draft.pick('p1', 'A1');
		expect(() => draft.resolveRound()).toThrow('Missing pending pick');
	});

	it('supports snapshots and round restoration', () => {
		const initial = new RotatingDraft(
			{
				p1: ['A1', 'A2'],
				p2: ['B1', 'B2'],
			},
			{ alternateDirectionPerRound: true }
		);

		initial.pick('p1', 'A1');
		initial.pick('p2', 'B1');
		initial.resolveRound();

		const restored = RotatingDraft.fromSnapshot(initial.toSnapshot());

		expect(restored.currentRound()).toBe(2);
		expect(restored.currentDirection()).toBe('right');
		expect(restored.hand('p1')).toEqual(['B2']);
		expect(restored.hand('p2')).toEqual(['A2']);
	});
});
