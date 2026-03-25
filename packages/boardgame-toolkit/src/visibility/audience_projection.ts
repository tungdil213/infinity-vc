import {
	type HandCardVisibility,
	type HandVisibilityResolver,
	projectHandsForViewer,
	sortPlayerIdsByOrder,
	type ProjectedHand,
	type ProjectHandsOptions,
	type HiddenCardMask,
} from '../cards/hand_visibility.js';
import {
	projectZonesForViewer,
	type ZoneItemVisibility,
	type ZoneVisibilityResolver,
	type ProjectedZone,
	type ProjectZonesOptions,
	type HiddenZoneItemMask,
} from '../zones/zone_visibility.js';

export type AudienceKind = 'public' | 'spectator' | 'player';

export interface AudienceViewer<TPlayerId extends string> {
	readonly kind: AudienceKind;
	readonly playerId?: TPlayerId;
}

export interface AudienceRule<TVisibility extends string> {
	readonly showCount: boolean;
	readonly visibility: TVisibility;
}

export interface AudienceHandPolicy {
	readonly publicRule: AudienceRule<HandCardVisibility>;
	readonly spectatorRule: AudienceRule<HandCardVisibility>;
	readonly playerOwnRule: AudienceRule<HandCardVisibility>;
	readonly playerOtherRule: AudienceRule<HandCardVisibility>;
	readonly missingPlayerRule?: AudienceRule<HandCardVisibility>;
}

export interface AudienceZonePolicy {
	readonly publicOwnedRule: AudienceRule<ZoneItemVisibility>;
	readonly publicUnownedRule: AudienceRule<ZoneItemVisibility>;
	readonly spectatorOwnedRule: AudienceRule<ZoneItemVisibility>;
	readonly spectatorUnownedRule: AudienceRule<ZoneItemVisibility>;
	readonly playerOwnedRule: AudienceRule<ZoneItemVisibility>;
	readonly playerOtherOwnedRule: AudienceRule<ZoneItemVisibility>;
	readonly playerUnownedRule: AudienceRule<ZoneItemVisibility>;
	readonly missingPlayerOwnedRule?: AudienceRule<ZoneItemVisibility>;
	readonly missingPlayerUnownedRule?: AudienceRule<ZoneItemVisibility>;
}

export interface VisibilitySortPolicy<TPlayerId extends string, TCard, TZoneId extends string, TZoneItem> {
	readonly hands?: {
		readonly byPlayerOrder?: readonly TPlayerId[];
		readonly byVisibility?: ProjectHandsOptions<TPlayerId, TCard>['sortCardsByVisibility'];
	};
	readonly zones?: {
		readonly byZoneOrder?: readonly TZoneId[];
		readonly byVisibility?: ProjectZonesOptions<TZoneId, TZoneItem>['sortItemsByVisibility'];
	};
}

export interface VisibilityProjectionState<TPlayerId extends string, TCard, TZoneId extends string, TZoneItem> {
	readonly handsByPlayer: Record<TPlayerId, readonly TCard[]>;
	readonly zonesById: Record<TZoneId, readonly TZoneItem[]>;
	readonly zoneOwners?: Partial<Record<TZoneId, TPlayerId>>;
}

export interface ProjectVisibilityForAudienceOptions<
	TPlayerId extends string,
	TCard,
	TZoneId extends string,
	TZoneItem,
	TCardMask = HiddenCardMask<TPlayerId>,
	TZoneMask = HiddenZoneItemMask<TZoneId>,
> {
	readonly viewer: AudienceViewer<TPlayerId>;
	readonly state: VisibilityProjectionState<TPlayerId, TCard, TZoneId, TZoneItem>;
	readonly handPolicy?: Partial<AudienceHandPolicy>;
	readonly zonePolicy?: Partial<AudienceZonePolicy>;
	readonly sort?: VisibilitySortPolicy<TPlayerId, TCard, TZoneId, TZoneItem>;
	readonly maskCard?: ProjectHandsOptions<TPlayerId, TCard, TCardMask>['maskCard'];
	readonly maskZoneItem?: ProjectZonesOptions<TZoneId, TZoneItem, TZoneMask>['maskItem'];
}

export interface AudienceProjectionResult<
	TPlayerId extends string,
	TCard,
	TZoneId extends string,
	TZoneItem,
	TCardMask,
	TZoneMask,
> {
	readonly audience: AudienceViewer<TPlayerId>;
	readonly hands: readonly ProjectedHand<TPlayerId, TCard, TCardMask>[];
	readonly zones: readonly ProjectedZone<TZoneId, TZoneItem, TZoneMask>[];
}

const createRule = <TVisibility extends string>(
	showCount: boolean,
	visibility: TVisibility
): AudienceRule<TVisibility> => ({
	showCount,
	visibility,
});

export const defaultAudienceHandPolicy: AudienceHandPolicy = {
	publicRule: createRule(true, 'hidden'),
	spectatorRule: createRule(true, 'hidden'),
	playerOwnRule: createRule(true, 'visible'),
	playerOtherRule: createRule(true, 'masked'),
	missingPlayerRule: createRule(true, 'hidden'),
};

export const defaultAudienceZonePolicy: AudienceZonePolicy = {
	publicOwnedRule: createRule(true, 'hidden'),
	publicUnownedRule: createRule(true, 'visible'),
	spectatorOwnedRule: createRule(true, 'hidden'),
	spectatorUnownedRule: createRule(true, 'visible'),
	playerOwnedRule: createRule(true, 'visible'),
	playerOtherOwnedRule: createRule(true, 'masked'),
	playerUnownedRule: createRule(true, 'visible'),
	missingPlayerOwnedRule: createRule(true, 'hidden'),
	missingPlayerUnownedRule: createRule(true, 'visible'),
};

const toViewerId = <TPlayerId extends string>(viewer: AudienceViewer<TPlayerId>): string => {
	if (viewer.kind === 'player') {
		return viewer.playerId ?? 'spectator';
	}

	return viewer.kind;
};

const toHandRule = (
	rule: AudienceRule<HandCardVisibility>
): {
	readonly showCount: boolean;
	readonly cardVisibility: HandCardVisibility;
} => ({
	showCount: rule.showCount,
	cardVisibility: rule.visibility,
});

const toZoneRule = (
	rule: AudienceRule<ZoneItemVisibility>
): {
	readonly showCount: boolean;
	readonly itemVisibility: ZoneItemVisibility;
} => ({
	showCount: rule.showCount,
	itemVisibility: rule.visibility,
});

const mergeHandPolicy = (overrides?: Partial<AudienceHandPolicy>): AudienceHandPolicy => ({
	...defaultAudienceHandPolicy,
	...overrides,
});

const mergeZonePolicy = (overrides?: Partial<AudienceZonePolicy>): AudienceZonePolicy => ({
	...defaultAudienceZonePolicy,
	...overrides,
});

const buildZoneSort = <TZoneId extends string>(orderedZones: readonly TZoneId[]) => {
	const indexByZone = new Map(orderedZones.map((zoneId, index) => [zoneId, index]));

	return (left: TZoneId, right: TZoneId): number => {
		const leftIndex = indexByZone.get(left);
		const rightIndex = indexByZone.get(right);

		if (leftIndex === undefined || rightIndex === undefined) {
			return left.localeCompare(right);
		}

		return leftIndex - rightIndex;
	};
};

export const createAudienceHandResolver = <TPlayerId extends string, TCard>(
	viewer: AudienceViewer<TPlayerId>,
	policyOverrides?: Partial<AudienceHandPolicy>
): HandVisibilityResolver<TPlayerId, TCard> => {
	const policy = mergeHandPolicy(policyOverrides);

	if (viewer.kind === 'public') {
		return () => toHandRule(policy.publicRule);
	}

	if (viewer.kind === 'spectator') {
		return () => toHandRule(policy.spectatorRule);
	}

	if (!viewer.playerId) {
		return () => toHandRule(policy.missingPlayerRule ?? policy.spectatorRule);
	}

	return ({ ownerId }) => {
		if (viewer.playerId === ownerId) {
			return toHandRule(policy.playerOwnRule);
		}

		return toHandRule(policy.playerOtherRule);
	};
};

export const createAudienceZoneResolver = <TPlayerId extends string, TZoneId extends string, TZoneItem>(
	viewer: AudienceViewer<TPlayerId>,
	zoneOwners: Partial<Record<TZoneId, TPlayerId>>,
	policyOverrides?: Partial<AudienceZonePolicy>
): ZoneVisibilityResolver<TZoneId, TZoneItem> => {
	const policy = mergeZonePolicy(policyOverrides);

	const resolveByOwnedState = (
		ownedRule: AudienceRule<ZoneItemVisibility>,
		unownedRule: AudienceRule<ZoneItemVisibility>
	): ZoneVisibilityResolver<TZoneId, TZoneItem> => {
		return ({ zoneId }) => {
			const owner = zoneOwners[zoneId];
			if (!owner) {
				return toZoneRule(unownedRule);
			}

			return toZoneRule(ownedRule);
		};
	};

	if (viewer.kind === 'public') {
		return resolveByOwnedState(policy.publicOwnedRule, policy.publicUnownedRule);
	}

	if (viewer.kind === 'spectator') {
		return resolveByOwnedState(policy.spectatorOwnedRule, policy.spectatorUnownedRule);
	}

	if (!viewer.playerId) {
		return resolveByOwnedState(
			policy.missingPlayerOwnedRule ?? policy.spectatorOwnedRule,
			policy.missingPlayerUnownedRule ?? policy.spectatorUnownedRule
		);
	}

	return ({ zoneId }) => {
		const owner = zoneOwners[zoneId];

		if (!owner) {
			return toZoneRule(policy.playerUnownedRule);
		}

		if (owner === viewer.playerId) {
			return toZoneRule(policy.playerOwnedRule);
		}

		return toZoneRule(policy.playerOtherOwnedRule);
	};
};

export const projectVisibilityForAudience = <
	TPlayerId extends string,
	TCard,
	TZoneId extends string,
	TZoneItem,
	TCardMask = HiddenCardMask<TPlayerId>,
	TZoneMask = HiddenZoneItemMask<TZoneId>,
>(
	options: ProjectVisibilityForAudienceOptions<TPlayerId, TCard, TZoneId, TZoneItem, TCardMask, TZoneMask>
): AudienceProjectionResult<TPlayerId, TCard, TZoneId, TZoneItem, TCardMask, TZoneMask> => {
	const handResolver = createAudienceHandResolver<TPlayerId, TCard>(options.viewer, options.handPolicy);
	const zoneResolver = createAudienceZoneResolver<TPlayerId, TZoneId, TZoneItem>(
		options.viewer,
		options.state.zoneOwners ?? {},
		options.zonePolicy
	);
	const viewerId = toViewerId(options.viewer);
	const handsSortByOrder = options.sort?.hands?.byPlayerOrder
		? sortPlayerIdsByOrder(options.sort.hands.byPlayerOrder)
		: undefined;
	const zonesSortByOrder = options.sort?.zones?.byZoneOrder ? buildZoneSort(options.sort.zones.byZoneOrder) : undefined;

	const hands = projectHandsForViewer<TPlayerId, TCard, TCardMask>({
		viewerId,
		handsByPlayer: options.state.handsByPlayer,
		resolveVisibility: handResolver,
		maskCard: options.maskCard,
		sortHands: handsSortByOrder,
		sortCardsByVisibility: options.sort?.hands?.byVisibility,
	});
	const zones = projectZonesForViewer<TZoneId, TZoneItem, TZoneMask>({
		viewerId,
		zonesById: options.state.zonesById,
		resolveVisibility: zoneResolver,
		maskItem: options.maskZoneItem,
		sortZones: zonesSortByOrder,
		sortItemsByVisibility: options.sort?.zones?.byVisibility,
	});

	return {
		audience: options.viewer,
		hands,
		zones,
	};
};
