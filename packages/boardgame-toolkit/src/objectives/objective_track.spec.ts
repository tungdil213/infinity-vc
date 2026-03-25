import { describe, expect, it } from 'vitest';
import { ObjectiveTrack } from './objective_track.js';

describe('ObjectiveTrack', () => {
	it('registers and claims one-shot objectives', () => {
		const track = new ObjectiveTrack<'first_city' | 'patron', 'p1' | 'p2'>();

		track.register({
			id: 'first_city',
			name: 'Build your first city',
			points: 5,
		});

		track.claim('first_city', 'p1', 100);

		expect(track.scoreForPlayer('p1')).toBe(5);
		expect(track.canClaim('first_city', 'p2')).toBe(false);
		expect(() => track.claim('first_city', 'p2', 110)).toThrow('cannot claim');
	});

	it('supports repeatable objectives with per-player limits', () => {
		const track = new ObjectiveTrack<'monster' | 'artifact', 'p1' | 'p2'>();

		track.register({
			id: 'monster',
			name: 'Defeat monsters',
			points: 2,
			maxClaims: 5,
			maxClaimsPerPlayer: 2,
		});

		track.claim('monster', 'p1');
		track.claim('monster', 'p1');
		expect(track.scoreForPlayer('p1')).toBe(4);
		expect(track.canClaim('monster', 'p1')).toBe(false);
	});

	it('serializes and restores snapshots', () => {
		const initial = new ObjectiveTrack<'trade_route', 'p1' | 'p2'>();

		initial.register({
			id: 'trade_route',
			name: 'Open route',
			points: 3,
			maxClaims: 2,
		});

		initial.claim('trade_route', 'p1', 1000);

		const restored = ObjectiveTrack.fromSnapshot(initial.toSnapshot());

		expect(restored.claimsForObjective('trade_route')).toEqual([{ playerId: 'p1', atMs: 1000 }]);
		expect(restored.scoreForPlayer('p1')).toBe(3);
		expect(restored.leaderboard(['p1', 'p2'])).toEqual([
			{ playerId: 'p1', score: 3 },
			{ playerId: 'p2', score: 0 },
		]);
	});
});
