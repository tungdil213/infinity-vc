import { describe, expect, it } from 'vitest';
import { CommitRevealRound } from './commit_reveal_round.js';

describe('CommitRevealRound', () => {
	it('collects submissions, locks and resolves in custom order', () => {
		const round = new CommitRevealRound(['p1', 'p2', 'p3'] as const);

		round.submit('p1', 'A');
		round.submit('p2', 'B');
		round.submit('p3', 'C');
		round.lock();

		const resolved = round.resolve(['p2', 'p1', 'p3']);

		expect(round.currentStatus()).toBe('resolved');
		expect(resolved.byPlayer).toEqual({ p1: 'A', p2: 'B', p3: 'C' });
		expect(resolved.ordered).toEqual([
			{ playerId: 'p2', choice: 'B' },
			{ playerId: 'p1', choice: 'A' },
			{ playerId: 'p3', choice: 'C' },
		]);
	});

	it('prevents locking before everyone submitted when configured', () => {
		const round = new CommitRevealRound(['p1', 'p2'] as const, {
			requireAllBeforeLock: true,
		});

		round.submit('p1', 'ready');
		expect(() => round.lock()).toThrow('before all players');
		expect(round.statusView().missingPlayers).toEqual(['p2']);
	});

	it('supports snapshot roundtrip', () => {
		const initial = new CommitRevealRound(['p1', 'p2'] as const, {
			allowOverride: false,
		});

		initial.submit('p1', 3);
		initial.submit('p2', 5);
		initial.lock();

		const restored = CommitRevealRound.fromSnapshot(initial.toSnapshot());

		expect(restored.revealAll()).toEqual({ p1: 3, p2: 5 });
		expect(restored.currentStatus()).toBe('locked');
		expect(() => restored.submit('p1', 8)).toThrow('not open');
	});
});
