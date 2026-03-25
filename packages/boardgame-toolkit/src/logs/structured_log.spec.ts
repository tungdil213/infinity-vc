import { describe, expect, it } from 'vitest';
import { StructuredLog } from './structured_log.js';

describe('StructuredLog', () => {
	it('stores structured entries with audience filtering', () => {
		const log = new StructuredLog<'p1' | 'p2'>();

		log.append({
			key: 'turn.start',
			params: { playerId: 'p1' },
			audience: 'all',
		});

		log.append({
			key: 'card.draw',
			params: { count: 1 },
			audience: { players: ['p1'] },
		});

		log.append({
			key: 'secret',
			params: { note: 'x' },
			audience: { allExcept: ['p2'] },
		});

		expect(log.listForViewer('p1').map((entry) => entry.key)).toEqual(['turn.start', 'card.draw', 'secret']);
		expect(log.listForViewer('p2').map((entry) => entry.key)).toEqual(['turn.start']);
		expect(log.listForViewer('spectator').map((entry) => entry.key)).toEqual(['turn.start', 'secret']);
		expect(log.listForViewer('omniscient').map((entry) => entry.key)).toEqual(['turn.start', 'card.draw', 'secret']);
	});

	it('renders entries with template map and fallback', () => {
		const log = new StructuredLog<'p1'>();

		log.append({
			key: 'score.gain',
			params: { playerId: 'p1', amount: 3 },
		});

		log.append({
			key: 'unknown.key',
			params: { raw: true },
		});

		const rendered = log.renderForViewer('p1', {
			'score.gain': (params) => {
				const payload = params as { playerId: string; amount: number };
				return `${payload.playerId} +${payload.amount}`;
			},
		});

		expect(rendered).toEqual(['p1 +3', 'unknown.key {"raw":true}']);
	});

	it('supports snapshot roundtrip', () => {
		const initial = new StructuredLog<'p1' | 'p2'>();
		initial.append({
			key: 'a',
		});
		initial.append({
			key: 'b',
			audience: { players: ['p2'] },
		});

		const restored = StructuredLog.fromSnapshot(initial.toSnapshot());
		expect(restored.listAll().map((entry) => entry.key)).toEqual(['a', 'b']);
		expect(restored.listForViewer('p1').map((entry) => entry.key)).toEqual(['a']);
		expect(restored.listForViewer('p2').map((entry) => entry.key)).toEqual(['a', 'b']);
	});
});
