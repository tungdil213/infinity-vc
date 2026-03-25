import { describe, expect, it } from 'vitest';
import {
	compareCardsBySuitRank,
	createCountOnlyPolicy,
	createOwnerSeesOthersCardsPolicy,
	createOwnerSeesOwnCardsPolicy,
	projectHandsForViewer,
	sortPlayerIdsByOrder,
} from './hand_visibility.js';

interface TestCard {
	readonly id: string;
	readonly suit: string;
	readonly rank: string;
}

const handsByPlayer: Record<'p1' | 'p2', readonly TestCard[]> = {
	p1: [
		{ id: 'H-A', suit: 'hearts', rank: 'A' },
		{ id: 'C-2', suit: 'clubs', rank: '2' },
	],
	p2: [
		{ id: 'S-K', suit: 'spades', rank: 'K' },
		{ id: 'D-10', suit: 'diamonds', rank: '10' },
	],
};

describe('hand visibility', () => {
	it('supports Jass-like policy: own cards visible, opponent cards hidden with count', () => {
		const view = projectHandsForViewer({
			viewerId: 'p1',
			handsByPlayer,
			resolveVisibility: createOwnerSeesOwnCardsPolicy(),
		});

		expect(view).toEqual([
			{
				ownerId: 'p1',
				count: 2,
				cardVisibility: 'visible',
				cards: handsByPlayer.p1,
			},
			{
				ownerId: 'p2',
				count: 2,
				cardVisibility: 'hidden',
			},
		]);
	});

	it('supports Hanabi-like policy: own cards hidden, other hands visible', () => {
		const view = projectHandsForViewer({
			viewerId: 'p1',
			handsByPlayer,
			resolveVisibility: createOwnerSeesOthersCardsPolicy(),
		});

		expect(view).toEqual([
			{
				ownerId: 'p1',
				count: 2,
				cardVisibility: 'hidden',
			},
			{
				ownerId: 'p2',
				count: 2,
				cardVisibility: 'visible',
				cards: handsByPlayer.p2,
			},
		]);
	});

	it('supports masked cards and stable count-only projection', () => {
		const maskedView = projectHandsForViewer<'p1' | 'p2', TestCard, string>({
			viewerId: 'p2',
			handsByPlayer,
			resolveVisibility: createOwnerSeesOwnCardsPolicy({
				opponentCardVisibility: 'masked',
			}),
			maskCard: ({ ownerId, index }) => `${ownerId}-back-${index + 1}`,
		});

		expect(maskedView[0]).toEqual({
			ownerId: 'p1',
			count: 2,
			cardVisibility: 'masked',
			cards: ['p1-back-1', 'p1-back-2'],
		});

		const countOnlyView = projectHandsForViewer({
			viewerId: 'spectator',
			handsByPlayer,
			resolveVisibility: createCountOnlyPolicy(),
		});

		expect(countOnlyView).toEqual([
			{
				ownerId: 'p1',
				count: 2,
				cardVisibility: 'hidden',
			},
			{
				ownerId: 'p2',
				count: 2,
				cardVisibility: 'hidden',
			},
		]);
	});

	it('sorts hands by player order and visible cards by suit/rank', () => {
		const view = projectHandsForViewer({
			viewerId: 'omniscient',
			handsByPlayer,
			resolveVisibility: createOwnerSeesOwnCardsPolicy(),
			sortHands: sortPlayerIdsByOrder(['p2', 'p1']),
			sortVisibleCards: compareCardsBySuitRank,
		});

		expect(view.map((entry) => entry.ownerId)).toEqual(['p2', 'p1']);
		expect(view[0]?.cards).toEqual([
			{ id: 'D-10', suit: 'diamonds', rank: '10' },
			{ id: 'S-K', suit: 'spades', rank: 'K' },
		]);
		expect(view[1]?.cards).toEqual([
			{ id: 'C-2', suit: 'clubs', rank: '2' },
			{ id: 'H-A', suit: 'hearts', rank: 'A' },
		]);
	});

	it('supports per-visibility sorting policy for masked cards', () => {
		const view = projectHandsForViewer({
			viewerId: 'p1',
			handsByPlayer,
			resolveVisibility: createOwnerSeesOwnCardsPolicy({
				opponentCardVisibility: 'masked',
			}),
			sortCardsByVisibility: {
				masked: compareCardsBySuitRank,
			},
			maskCard: ({ card }) => card.id,
		});

		const opponentHand = view.find((entry) => entry.ownerId === 'p2');
		expect(opponentHand).toEqual({
			ownerId: 'p2',
			count: 2,
			cardVisibility: 'masked',
			cards: ['D-10', 'S-K'],
		});
	});
});
