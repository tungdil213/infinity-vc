export type PlayerViewerId<TPlayerId extends string> = TPlayerId | 'spectator' | 'omniscient';

export type HandCardVisibility = 'visible' | 'masked' | 'hidden';

export interface HandVisibilityRule {
	readonly showCount: boolean;
	readonly cardVisibility: HandCardVisibility;
}

export interface HandVisibilityContext<TPlayerId extends string, TCard> {
	readonly viewerId: string;
	readonly ownerId: TPlayerId;
	readonly hand: readonly TCard[];
}

export type HandVisibilityResolver<TPlayerId extends string, TCard> = (
	context: HandVisibilityContext<TPlayerId, TCard>
) => HandVisibilityRule;

export interface HiddenCardMask<TPlayerId extends string> {
	readonly hidden: true;
	readonly ownerId: TPlayerId;
	readonly index: number;
}

export interface ProjectedHand<TPlayerId extends string, TCard, TMask> {
	readonly ownerId: TPlayerId;
	readonly count: number | null;
	readonly cardVisibility: HandCardVisibility;
	readonly cards?: readonly (TCard | TMask)[];
}

export interface ProjectHandsOptions<TPlayerId extends string, TCard, TMask = HiddenCardMask<TPlayerId>> {
	readonly viewerId: string;
	readonly handsByPlayer: Record<TPlayerId, readonly TCard[]>;
	readonly resolveVisibility: HandVisibilityResolver<TPlayerId, TCard>;
	readonly maskCard?: (
		context: HandVisibilityContext<TPlayerId, TCard> & {
			readonly card: TCard;
			readonly index: number;
		}
	) => TMask;
	readonly sortHands?: (left: TPlayerId, right: TPlayerId) => number;
	readonly sortVisibleCards?: (left: TCard, right: TCard) => number;
	readonly sortCardsByVisibility?: Partial<
		Record<Exclude<HandCardVisibility, 'hidden'>, (left: TCard, right: TCard) => number>
	>;
}

export interface CardLike {
	readonly id?: string;
	readonly suit?: string;
	readonly rank?: string;
	readonly value?: number;
}

export interface CardSortOptions {
	readonly suitOrder?: readonly string[];
	readonly rankOrder?: readonly string[];
}

const DEFAULT_SUIT_ORDER = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
const DEFAULT_RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

const assertVisibilityRule = (rule: HandVisibilityRule): void => {
	if (typeof rule.showCount !== 'boolean') {
		throw new TypeError('Hand visibility rule must define showCount as boolean');
	}

	if (!['visible', 'masked', 'hidden'].includes(rule.cardVisibility)) {
		throw new TypeError(`Unsupported hand card visibility: ${rule.cardVisibility}`);
	}
};

export const projectHandsForViewer = <TPlayerId extends string, TCard, TMask = HiddenCardMask<TPlayerId>>(
	options: ProjectHandsOptions<TPlayerId, TCard, TMask>
): readonly ProjectedHand<TPlayerId, TCard, TMask>[] => {
	const entries = Object.entries(options.handsByPlayer) as [TPlayerId, readonly TCard[]][];
	const orderedEntries = options.sortHands
		? [...entries].sort(([left], [right]) => options.sortHands!(left, right))
		: entries;

	return orderedEntries.map(([ownerId, hand]) => {
		const context: HandVisibilityContext<TPlayerId, TCard> = {
			viewerId: options.viewerId,
			ownerId,
			hand,
		};

		const visibility = options.resolveVisibility(context);
		assertVisibilityRule(visibility);

		const count = visibility.showCount ? hand.length : null;

		if (visibility.cardVisibility === 'hidden') {
			return {
				ownerId,
				count,
				cardVisibility: visibility.cardVisibility,
			};
		}

		if (visibility.cardVisibility === 'visible') {
			const sortVisibleCards = options.sortCardsByVisibility?.visible ?? options.sortVisibleCards;
			const cards = sortVisibleCards ? [...hand].sort(sortVisibleCards) : [...hand];

			return {
				ownerId,
				count,
				cardVisibility: visibility.cardVisibility,
				cards,
			};
		}

		const sortMaskedCards = options.sortCardsByVisibility?.masked;
		const sourceCards = sortMaskedCards ? [...hand].sort(sortMaskedCards) : [...hand];
		const cards = sourceCards.map((card, index) => {
			if (options.maskCard) {
				return options.maskCard({
					...context,
					card,
					index,
				});
			}

			return {
				hidden: true,
				ownerId,
				index,
			} as TMask;
		});

		return {
			ownerId,
			count,
			cardVisibility: visibility.cardVisibility,
			cards,
		};
	});
};

export const createOwnerSeesOwnCardsPolicy = <TPlayerId extends string, TCard>(
	options: {
		readonly opponentCardVisibility?: Exclude<HandCardVisibility, 'visible'>;
		readonly opponentShowCount?: boolean;
	} = {}
): HandVisibilityResolver<TPlayerId, TCard> => {
	const opponentCardVisibility = options.opponentCardVisibility ?? 'hidden';
	const opponentShowCount = options.opponentShowCount ?? true;

	return ({ viewerId, ownerId }) => {
		if (viewerId === 'omniscient' || viewerId === ownerId) {
			return {
				showCount: true,
				cardVisibility: 'visible',
			};
		}

		return {
			showCount: opponentShowCount,
			cardVisibility: opponentCardVisibility,
		};
	};
};

export const createOwnerSeesOthersCardsPolicy = <TPlayerId extends string, TCard>(
	options: {
		readonly ownCardVisibility?: Exclude<HandCardVisibility, 'visible'>;
		readonly ownShowCount?: boolean;
	} = {}
): HandVisibilityResolver<TPlayerId, TCard> => {
	const ownCardVisibility = options.ownCardVisibility ?? 'hidden';
	const ownShowCount = options.ownShowCount ?? true;

	return ({ viewerId, ownerId }) => {
		if (viewerId === 'omniscient') {
			return {
				showCount: true,
				cardVisibility: 'visible',
			};
		}

		if (viewerId === ownerId) {
			return {
				showCount: ownShowCount,
				cardVisibility: ownCardVisibility,
			};
		}

		return {
			showCount: true,
			cardVisibility: 'visible',
		};
	};
};

export const createCountOnlyPolicy = <TPlayerId extends string, TCard>(): HandVisibilityResolver<TPlayerId, TCard> => {
	return () => ({
		showCount: true,
		cardVisibility: 'hidden',
	});
};

export const sortPlayerIdsByOrder = <TPlayerId extends string>(playerOrder: readonly TPlayerId[]) => {
	const indexByPlayer = new Map(playerOrder.map((playerId, index) => [playerId, index]));

	return (left: TPlayerId, right: TPlayerId): number => {
		const leftIndex = indexByPlayer.get(left);
		const rightIndex = indexByPlayer.get(right);

		if (leftIndex === undefined || rightIndex === undefined) {
			return left.localeCompare(right);
		}

		return leftIndex - rightIndex;
	};
};

export const compareCardsBySuitRank = (left: CardLike, right: CardLike, options: CardSortOptions = {}): number => {
	const suitOrder = options.suitOrder ?? DEFAULT_SUIT_ORDER;
	const rankOrder = options.rankOrder ?? DEFAULT_RANK_ORDER;

	const leftSuit = left.suit ?? '';
	const rightSuit = right.suit ?? '';
	const leftSuitIndex = suitOrder.indexOf(leftSuit);
	const rightSuitIndex = suitOrder.indexOf(rightSuit);

	if (leftSuitIndex !== rightSuitIndex) {
		if (leftSuitIndex < 0) {
			return 1;
		}

		if (rightSuitIndex < 0) {
			return -1;
		}

		return leftSuitIndex - rightSuitIndex;
	}

	const leftRank = left.rank ?? '';
	const rightRank = right.rank ?? '';
	const leftRankIndex = rankOrder.indexOf(leftRank);
	const rightRankIndex = rankOrder.indexOf(rightRank);

	if (leftRankIndex !== rightRankIndex) {
		if (leftRankIndex < 0) {
			return 1;
		}

		if (rightRankIndex < 0) {
			return -1;
		}

		return leftRankIndex - rightRankIndex;
	}

	const leftValue = left.value;
	const rightValue = right.value;

	if (typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue !== rightValue) {
		return leftValue - rightValue;
	}

	const leftId = left.id ?? '';
	const rightId = right.id ?? '';
	return leftId.localeCompare(rightId);
};
