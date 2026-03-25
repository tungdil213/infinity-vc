import { describe, expect, it } from 'vitest';
import { createOwnedZoneVisibility, projectZonesForViewer } from './zone_visibility.js';

type PlayerId = 'p1' | 'p2';

type ZoneId = 'public_market' | 'p1_hand' | 'p2_hand';

const zonesById = {
	public_market: ['market-card-1', 'market-card-2'],
	p1_hand: ['p1-card-A', 'p1-card-K'],
	p2_hand: ['p2-card-Q', 'p2-card-10'],
} as const satisfies Record<ZoneId, readonly string[]>;

describe('zone visibility', () => {
	it('exposes owned zones and hides non-owned zones while keeping counts', () => {
		const resolveVisibility = createOwnedZoneVisibility<PlayerId, ZoneId, string>(
			{
				p1_hand: 'p1',
				p2_hand: 'p2',
			},
			{
				nonOwnerItemVisibility: 'hidden',
				nonOwnerShowCount: true,
			}
		);

		const view = projectZonesForViewer({
			viewerId: 'p1',
			zonesById,
			resolveVisibility,
		});

		expect(view).toEqual([
			{
				zoneId: 'public_market',
				count: 2,
				itemVisibility: 'visible',
				items: ['market-card-1', 'market-card-2'],
			},
			{
				zoneId: 'p1_hand',
				count: 2,
				itemVisibility: 'visible',
				items: ['p1-card-A', 'p1-card-K'],
			},
			{
				zoneId: 'p2_hand',
				count: 2,
				itemVisibility: 'hidden',
			},
		]);
	});

	it('supports masked non-owner zones', () => {
		const resolveVisibility = createOwnedZoneVisibility<PlayerId, ZoneId, string>(
			{
				p1_hand: 'p1',
				p2_hand: 'p2',
			},
			{
				nonOwnerItemVisibility: 'masked',
			}
		);

		const view = projectZonesForViewer({
			viewerId: 'p1',
			zonesById,
			resolveVisibility,
			maskItem: ({ zoneId, index }) => `${zoneId}-back-${index + 1}`,
		});

		expect(view.find((zone) => zone.zoneId === 'p2_hand')).toEqual({
			zoneId: 'p2_hand',
			count: 2,
			itemVisibility: 'masked',
			items: ['p2_hand-back-1', 'p2_hand-back-2'],
		});
	});

	it('keeps omniscient view fully visible', () => {
		const resolveVisibility = createOwnedZoneVisibility<PlayerId, ZoneId, string>({
			p1_hand: 'p1',
			p2_hand: 'p2',
		});

		const view = projectZonesForViewer({
			viewerId: 'omniscient',
			zonesById,
			resolveVisibility,
		});

		expect(view.every((zone) => zone.itemVisibility === 'visible')).toBe(true);
		expect(view.every((zone) => zone.count === 2)).toBe(true);
	});

	it('supports per-visibility sorting policy for masked zone items', () => {
		const resolveVisibility = createOwnedZoneVisibility<PlayerId, ZoneId, string>(
			{
				p1_hand: 'p1',
				p2_hand: 'p2',
			},
			{
				nonOwnerItemVisibility: 'masked',
			}
		);

		const view = projectZonesForViewer({
			viewerId: 'p1',
			zonesById,
			resolveVisibility,
			sortItemsByVisibility: {
				masked: (left, right) => right.localeCompare(left),
			},
			maskItem: ({ item }) => item,
		});

		expect(view.find((zone) => zone.zoneId === 'p2_hand')).toEqual({
			zoneId: 'p2_hand',
			count: 2,
			itemVisibility: 'masked',
			items: ['p2-card-Q', 'p2-card-10'],
		});
	});
});
