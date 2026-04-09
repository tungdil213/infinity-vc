import { describe, expect, it } from 'vitest';
import { compareCardsBySuitRank } from '../cards/hand_visibility.js';
import {
	createAudienceHandResolver,
	createAudienceZoneResolver,
	projectVisibilityForAudience,
} from './audience_projection.js';

type PlayerId = 'alice' | 'bob';

type ZoneId = 'market' | 'alice_hand' | 'bob_hand';

interface TestCard {
	readonly id: string;
	readonly suit: string;
	readonly rank: string;
}

const state = {
	handsByPlayer: {
		alice: [
			{ id: 'H-A', suit: 'hearts', rank: 'A' },
			{ id: 'C-2', suit: 'clubs', rank: '2' },
		],
		bob: [
			{ id: 'S-K', suit: 'spades', rank: 'K' },
			{ id: 'D-10', suit: 'diamonds', rank: '10' },
		],
	} as Record<PlayerId, readonly TestCard[]>,
	zonesById: {
		market: ['market-2', 'market-1'],
		alice_hand: ['alice-B', 'alice-A'],
		bob_hand: ['bob-Q', 'bob-10'],
	} as Record<ZoneId, readonly string[]>,
	zoneOwners: {
		alice_hand: 'alice',
		bob_hand: 'bob',
	} as Partial<Record<ZoneId, PlayerId>>,
} as const;

describe('audience projection', () => {
	it('projects player audience with private own hand and masked opponents', () => {
		const projection = projectVisibilityForAudience<PlayerId, TestCard, ZoneId, string, string, string>({
			viewer: { kind: 'player', playerId: 'alice' },
			state,
			maskCard: ({ ownerId, index }) => `${ownerId}-back-${index + 1}`,
			maskZoneItem: ({ zoneId, index }) => `${zoneId}-back-${index + 1}`,
			sort: {
				hands: {
					byPlayerOrder: ['alice', 'bob'],
					byVisibility: {
						visible: compareCardsBySuitRank,
						masked: compareCardsBySuitRank,
					},
				},
				zones: {
					byZoneOrder: ['market', 'alice_hand', 'bob_hand'],
					byVisibility: {
						masked: (left, right) => left.localeCompare(right),
						visible: (left, right) => left.localeCompare(right),
					},
				},
			},
		});

		expect(projection.hands).toEqual([
			{
				ownerId: 'alice',
				count: 2,
				cardVisibility: 'visible',
				cards: [
					{ id: 'C-2', suit: 'clubs', rank: '2' },
					{ id: 'H-A', suit: 'hearts', rank: 'A' },
				],
			},
			{
				ownerId: 'bob',
				count: 2,
				cardVisibility: 'masked',
				cards: ['bob-back-1', 'bob-back-2'],
			},
		]);
		expect(projection.zones).toEqual([
			{
				zoneId: 'market',
				count: 2,
				itemVisibility: 'visible',
				items: ['market-1', 'market-2'],
			},
			{
				zoneId: 'alice_hand',
				count: 2,
				itemVisibility: 'visible',
				items: ['alice-A', 'alice-B'],
			},
			{
				zoneId: 'bob_hand',
				count: 2,
				itemVisibility: 'masked',
				items: ['bob_hand-back-1', 'bob_hand-back-2'],
			},
		]);
	});

	it('projects spectator audience without leaking private card contents', () => {
		const projection = projectVisibilityForAudience({
			viewer: { kind: 'spectator' as const },
			state,
		});

		expect(projection.hands.every((hand) => hand.cardVisibility === 'hidden')).toBe(true);
		expect(projection.hands.every((hand) => hand.cards === undefined)).toBe(true);
		expect(projection.hands.every((hand) => hand.count === 2)).toBe(true);
		expect(projection.zones.find((zone) => zone.zoneId === 'market')).toEqual({
			zoneId: 'market',
			count: 2,
			itemVisibility: 'visible',
			items: ['market-2', 'market-1'],
		});
		expect(projection.zones.find((zone) => zone.zoneId === 'alice_hand')).toEqual({
			zoneId: 'alice_hand',
			count: 2,
			itemVisibility: 'hidden',
		});
	});

	it('supports public audience with same safe defaults', () => {
		const projection = projectVisibilityForAudience({
			viewer: { kind: 'public' as const },
			state,
		});

		expect(projection.hands.every((hand) => hand.cardVisibility === 'hidden')).toBe(true);
		expect(projection.hands.every((hand) => hand.count === 2)).toBe(true);
		expect(projection.zones.find((zone) => zone.zoneId === 'bob_hand')?.itemVisibility).toBe('hidden');
		expect(projection.zones.find((zone) => zone.zoneId === 'market')?.itemVisibility).toBe('visible');
	});

	it('handles empty hands and absent player viewers safely', () => {
		const projection = projectVisibilityForAudience<PlayerId, TestCard, ZoneId, string>({
			viewer: {
				kind: 'player',
			},
			state: {
				handsByPlayer: {
					alice: [],
					bob: state.handsByPlayer.bob,
				},
				zonesById: state.zonesById,
				zoneOwners: state.zoneOwners,
			},
		});

		expect(projection.hands.find((hand) => hand.ownerId === 'alice')).toEqual({
			ownerId: 'alice',
			count: 0,
			cardVisibility: 'hidden',
		});
		expect(projection.hands.find((hand) => hand.ownerId === 'bob')).toEqual({
			ownerId: 'bob',
			count: 2,
			cardVisibility: 'hidden',
		});
		expect(projection.zones.find((zone) => zone.zoneId === 'alice_hand')?.itemVisibility).toBe('hidden');
		expect(projection.zones.find((zone) => zone.zoneId === 'market')?.itemVisibility).toBe('visible');
	});

	it('builds resolvers independently from transport concerns', () => {
		const handResolver = createAudienceHandResolver<PlayerId, TestCard>({
			kind: 'player',
			playerId: 'alice',
		});
		const zoneResolver = createAudienceZoneResolver<PlayerId, ZoneId, string>(
			{
				kind: 'player',
				playerId: 'alice',
			},
			state.zoneOwners
		);

		expect(
			handResolver({
				viewerId: 'alice',
				ownerId: 'alice',
				hand: state.handsByPlayer.alice,
			})
		).toEqual({
			showCount: true,
			cardVisibility: 'visible',
		});
		expect(
			zoneResolver({
				viewerId: 'alice',
				zoneId: 'bob_hand',
				items: state.zonesById.bob_hand,
			})
		).toEqual({
			showCount: true,
			itemVisibility: 'masked',
		});
	});
});
