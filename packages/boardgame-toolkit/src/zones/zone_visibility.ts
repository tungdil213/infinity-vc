export type ZoneViewerId<TViewerId extends string> = TViewerId | 'spectator' | 'omniscient';

export type ZoneItemVisibility = 'visible' | 'masked' | 'hidden';

export interface ZoneVisibilityRule {
	readonly showCount: boolean;
	readonly itemVisibility: ZoneItemVisibility;
}

export interface ZoneVisibilityContext<TZoneId extends string, TItem> {
	readonly viewerId: string;
	readonly zoneId: TZoneId;
	readonly items: readonly TItem[];
}

export type ZoneVisibilityResolver<TZoneId extends string, TItem> = (
	context: ZoneVisibilityContext<TZoneId, TItem>
) => ZoneVisibilityRule;

export interface HiddenZoneItemMask<TZoneId extends string> {
	readonly hidden: true;
	readonly zoneId: TZoneId;
	readonly index: number;
}

export interface ProjectedZone<TZoneId extends string, TItem, TMask> {
	readonly zoneId: TZoneId;
	readonly count: number | null;
	readonly itemVisibility: ZoneItemVisibility;
	readonly items?: readonly (TItem | TMask)[];
}

export interface ProjectZonesOptions<TZoneId extends string, TItem, TMask = HiddenZoneItemMask<TZoneId>> {
	readonly viewerId: string;
	readonly zonesById: Record<TZoneId, readonly TItem[]>;
	readonly resolveVisibility: ZoneVisibilityResolver<TZoneId, TItem>;
	readonly maskItem?: (
		context: ZoneVisibilityContext<TZoneId, TItem> & {
			readonly item: TItem;
			readonly index: number;
		}
	) => TMask;
	readonly sortZones?: (left: TZoneId, right: TZoneId) => number;
	readonly sortVisibleItems?: (left: TItem, right: TItem) => number;
	readonly sortItemsByVisibility?: Partial<
		Record<Exclude<ZoneItemVisibility, 'hidden'>, (left: TItem, right: TItem) => number>
	>;
}

export interface CreateOwnedZoneVisibilityOptions {
	readonly nonOwnerItemVisibility?: Exclude<ZoneItemVisibility, 'visible'>;
	readonly nonOwnerShowCount?: boolean;
	readonly unownedZoneVisibility?: ZoneVisibilityRule;
}

const assertZoneVisibilityRule = (rule: ZoneVisibilityRule): void => {
	if (typeof rule.showCount !== 'boolean') {
		throw new TypeError('Zone visibility rule must define showCount as boolean');
	}

	if (!['visible', 'masked', 'hidden'].includes(rule.itemVisibility)) {
		throw new TypeError(`Unsupported zone item visibility: ${rule.itemVisibility}`);
	}
};

export const projectZonesForViewer = <TZoneId extends string, TItem, TMask = HiddenZoneItemMask<TZoneId>>(
	options: ProjectZonesOptions<TZoneId, TItem, TMask>
): readonly ProjectedZone<TZoneId, TItem, TMask>[] => {
	const entries = Object.entries(options.zonesById) as [TZoneId, readonly TItem[]][];
	const orderedEntries = options.sortZones
		? [...entries].sort(([left], [right]) => options.sortZones!(left, right))
		: entries;

	return orderedEntries.map(([zoneId, items]) => {
		const context: ZoneVisibilityContext<TZoneId, TItem> = {
			viewerId: options.viewerId,
			zoneId,
			items,
		};

		const visibility = options.resolveVisibility(context);
		assertZoneVisibilityRule(visibility);

		const count = visibility.showCount ? items.length : null;

		if (visibility.itemVisibility === 'hidden') {
			return {
				zoneId,
				count,
				itemVisibility: visibility.itemVisibility,
			};
		}

		if (visibility.itemVisibility === 'visible') {
			const sortVisibleItems = options.sortItemsByVisibility?.visible ?? options.sortVisibleItems;
			const zoneItems = sortVisibleItems ? [...items].sort(sortVisibleItems) : [...items];

			return {
				zoneId,
				count,
				itemVisibility: visibility.itemVisibility,
				items: zoneItems,
			};
		}

		const sortMaskedItems = options.sortItemsByVisibility?.masked;
		const sourceItems = sortMaskedItems ? [...items].sort(sortMaskedItems) : [...items];
		const zoneItems = sourceItems.map((item, index) => {
			if (options.maskItem) {
				return options.maskItem({
					...context,
					item,
					index,
				});
			}

			return {
				hidden: true,
				zoneId,
				index,
			} as TMask;
		});

		return {
			zoneId,
			count,
			itemVisibility: visibility.itemVisibility,
			items: zoneItems,
		};
	});
};

export const createOwnedZoneVisibility = <TViewerId extends string, TZoneId extends string, TItem>(
	zoneOwners: Partial<Record<TZoneId, TViewerId>>,
	options: CreateOwnedZoneVisibilityOptions = {}
): ZoneVisibilityResolver<TZoneId, TItem> => {
	const nonOwnerItemVisibility = options.nonOwnerItemVisibility ?? 'hidden';
	const nonOwnerShowCount = options.nonOwnerShowCount ?? true;
	const unownedZoneVisibility = options.unownedZoneVisibility ?? {
		showCount: true,
		itemVisibility: 'visible',
	};

	return ({ viewerId, zoneId }) => {
		if (viewerId === 'omniscient') {
			return {
				showCount: true,
				itemVisibility: 'visible',
			};
		}

		const ownerId = zoneOwners[zoneId];
		if (ownerId === undefined) {
			return unownedZoneVisibility;
		}

		if (ownerId === viewerId) {
			return {
				showCount: true,
				itemVisibility: 'visible',
			};
		}

		return {
			showCount: nonOwnerShowCount,
			itemVisibility: nonOwnerItemVisibility,
		};
	};
};
