import { describe, expect, it } from 'vitest';
import { SealedAuction } from './sealed_auction.js';

type PlayerId = 'alice' | 'bob' | 'claire';

describe('SealedAuction', () => {
	it('picks winner by highest bid and earliest tie-break', () => {
		const auction = new SealedAuction<PlayerId>({
			id: 'auction-1',
			tieBreaker: 'earliest',
		});

		auction.submitBid('alice', 5, 100);
		auction.submitBid('bob', 8, 110);
		auction.submitBid('claire', 8, 105);

		const resolution = auction.close(200);
		expect(resolution.winnerId).toBe('claire');
		expect(resolution.winningBid).toBe(8);
		expect(resolution.rankedBids.map((bid) => bid.playerId)).toEqual(['claire', 'bob', 'alice']);
	});

	it('does not leak bids while auction is open', () => {
		const auction = new SealedAuction<PlayerId>({
			id: 'auction-2',
			allowedBidders: ['alice', 'bob'],
		});
		auction.submitBid('alice', 4, 100);
		auction.submitBid('bob', 7, 101);

		const publicView = auction.projectForViewer({ kind: 'public' });
		expect(publicView.revealedBids).toBeNull();
		expect(publicView.yourBid).toBeNull();
		expect(publicView.bidCount).toBe(2);

		const playerView = auction.projectForViewer({ kind: 'player', playerId: 'alice' });
		expect(playerView.yourBid).toBe(4);
		expect(playerView.revealedBids).toBeNull();
		expect(playerView.canBid).toBe(true);
	});

	it('reveals ranked bids once closed', () => {
		const auction = new SealedAuction<PlayerId>({
			id: 'auction-3',
			allowedBidders: ['alice', 'bob'],
			tieBreaker: 'latest',
		});

		auction.submitBid('alice', 6, 100);
		auction.submitBid('bob', 6, 120);
		auction.close(130);

		const view = auction.projectForViewer({ kind: 'spectator' });
		expect(view.revealedBids?.map((bid) => bid.playerId)).toEqual(['bob', 'alice']);
		expect(view.winnerId).toBe('bob');
		expect(view.canBid).toBe(false);
	});

	it('supports reserve price and snapshot restore', () => {
		const auction = new SealedAuction<PlayerId>({
			id: 'auction-4',
			reservePrice: 10,
		});
		auction.submitBid('alice', 8, 1);
		auction.close(2);

		const snapshot = auction.toSnapshot();
		const restored = SealedAuction.fromSnapshot(snapshot);
		const view = restored.projectForViewer({ kind: 'public' });

		expect(view.winnerId).toBeUndefined();
		expect(view.winningBid).toBeUndefined();
		expect(view.revealedBids?.length).toBe(1);
	});
});
