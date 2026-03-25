import { describe, expect, test } from 'vitest';
import { ScoreTrack } from './score_track.js';

describe('ScoreTrack', () => {
	test('adds and ranks scores', () => {
		const track = new ScoreTrack({ p1: 3, p2: 8, p3: 5 });

		track.addPoints('p1', 5);

		expect(track.getScore('p1')).toBe(8);
		expect(track.leaderboard().map((entry) => entry.playerId)).toEqual(['p1', 'p2', 'p3']);
	});

	test('returns winners and target achievers', () => {
		const track = new ScoreTrack({ p1: 10, p2: 12, p3: 12 });

		expect(track.getWinners()).toEqual(['p2', 'p3']);
		expect(track.reachedTarget(11)).toEqual(['p2', 'p3']);
	});
});
