import { describe, expect, it } from 'vitest';
import { VoteSession } from './vote_session.js';

type PlayerId = 'alice' | 'bob' | 'claire';

type OptionId = 'accept' | 'reject' | 'abstain';

describe('VoteSession', () => {
	it('keeps ballots secret while vote is open', () => {
		const session = new VoteSession<PlayerId, OptionId>({
			id: 'vote-1',
			optionIds: ['accept', 'reject', 'abstain'],
			allowedVoters: ['alice', 'bob', 'claire'],
			ballotSecret: true,
		});

		session.castVote('alice', 'accept', 1, 100);
		session.castVote('bob', 'reject', 1, 110);

		const spectatorView = session.projectForViewer({ kind: 'spectator' });
		expect(spectatorView.tally).toBeNull();
		expect(spectatorView.ballots).toBeNull();
		expect(spectatorView.turnout).toBe(2);

		const aliceView = session.projectForViewer({ kind: 'player', playerId: 'alice' });
		expect(aliceView.yourVote).toBe('accept');
		expect(aliceView.tally).toBeNull();
	});

	it('returns tally and winners after close', () => {
		const session = new VoteSession<PlayerId, OptionId>({
			id: 'vote-2',
			optionIds: ['accept', 'reject', 'abstain'],
			allowedVoters: ['alice', 'bob', 'claire'],
			ballotSecret: true,
			revealBallotsOnClose: true,
		});

		session.castVote('alice', 'accept', 2, 100);
		session.castVote('bob', 'reject', 1, 101);
		session.castVote('claire', 'accept', 1, 102);
		const result = session.close(120);

		expect(result.tally).toEqual({
			accept: 3,
			reject: 1,
			abstain: 0,
		});
		expect(result.winnerOptionIds).toEqual(['accept']);
		expect(result.totalWeight).toBe(4);

		const publicView = session.projectForViewer({ kind: 'public' });
		expect(publicView.tally).toEqual(result.tally);
		expect(publicView.ballots?.length).toBe(3);
		expect(publicView.winnerOptionIds).toEqual(['accept']);
	});

	it('supports open tally mode', () => {
		const session = new VoteSession<PlayerId, OptionId>({
			id: 'vote-3',
			optionIds: ['accept', 'reject', 'abstain'],
			ballotSecret: false,
		});
		session.castVote('alice', 'accept', 1, 10);

		const publicView = session.projectForViewer({ kind: 'public' });
		expect(publicView.tally).toEqual({
			accept: 1,
			reject: 0,
			abstain: 0,
		});
		expect(publicView.ballots?.[0]?.playerId).toBe('alice');
	});

	it('enforces voters/options constraints and snapshot restore', () => {
		const session = new VoteSession<PlayerId, OptionId>({
			id: 'vote-4',
			optionIds: ['accept', 'reject', 'abstain'],
			allowedVoters: ['alice'],
			allowRevote: false,
		});

		expect(() => session.castVote('bob', 'accept')).toThrow('not allowed');
		session.castVote('alice', 'accept');
		expect(() => session.castVote('alice', 'reject')).toThrow('already voted');
		expect(() => session.castVote('alice', 'unknown' as OptionId)).toThrow('Unknown vote option');

		const snapshot = session.toSnapshot();
		const restored = VoteSession.fromSnapshot(snapshot);
		expect(restored.projectForViewer({ kind: 'player', playerId: 'alice' }).yourVote).toBe('accept');
	});
});
