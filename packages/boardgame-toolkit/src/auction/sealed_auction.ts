export type AuctionStatus = 'open' | 'closed';

export type AuctionAudience = 'public' | 'spectator' | 'player';

export interface AuctionViewer<TPlayerId extends string> {
	readonly kind: AuctionAudience;
	readonly playerId?: TPlayerId;
}

export interface AuctionBid<TPlayerId extends string> {
	readonly playerId: TPlayerId;
	readonly amount: number;
	readonly submittedAt: number;
}

export type AuctionTieBreaker = 'earliest' | 'latest' | 'player_order';

export interface SealedAuctionOptions<TPlayerId extends string> {
	readonly id: string;
	readonly allowedBidders?: readonly TPlayerId[];
	readonly allowBidUpdate?: boolean;
	readonly reservePrice?: number;
	readonly tieBreaker?: AuctionTieBreaker;
	readonly playerOrder?: readonly TPlayerId[];
}

export interface SealedAuctionResolution<TPlayerId extends string> {
	readonly status: 'closed';
	readonly closedAt: number;
	readonly winnerId?: TPlayerId;
	readonly winningBid?: number;
	readonly rankedBids: readonly AuctionBid<TPlayerId>[];
}

export interface SealedAuctionProjection<TPlayerId extends string> {
	readonly id: string;
	readonly status: AuctionStatus;
	readonly bidCount: number;
	readonly canBid: boolean;
	readonly yourBid: number | null;
	readonly winnerId?: TPlayerId;
	readonly winningBid?: number;
	readonly revealedBids: readonly AuctionBid<TPlayerId>[] | null;
}

export interface SealedAuctionProjectionOptions {
	readonly revealBidsWhenClosed?: boolean;
}

export interface SealedAuctionSnapshot<TPlayerId extends string> {
	readonly id: string;
	readonly status: AuctionStatus;
	readonly closedAt?: number;
	readonly bids: readonly AuctionBid<TPlayerId>[];
	readonly options: Omit<SealedAuctionOptions<TPlayerId>, 'id'>;
}

const assertFiniteTimestamp = (value: number, label: string): void => {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${label} must be finite`);
	}
};

const assertNonNegativeInteger = (value: number, label: string): void => {
	if (!Number.isInteger(value) || value < 0) {
		throw new TypeError(`${label} must be a non-negative integer`);
	}
};

const normalizeTieBreaker = (value: AuctionTieBreaker | undefined): AuctionTieBreaker => value ?? 'earliest';

const sortBids = <TPlayerId extends string>(
	bids: readonly AuctionBid<TPlayerId>[],
	tieBreaker: AuctionTieBreaker,
	playerOrder: readonly TPlayerId[]
): AuctionBid<TPlayerId>[] => {
	const orderIndex = new Map(playerOrder.map((playerId, index) => [playerId, index]));

	const compareForTie = (left: AuctionBid<TPlayerId>, right: AuctionBid<TPlayerId>): number => {
		if (tieBreaker === 'earliest') {
			if (left.submittedAt !== right.submittedAt) {
				return left.submittedAt - right.submittedAt;
			}
		} else if (tieBreaker === 'latest') {
			if (left.submittedAt !== right.submittedAt) {
				return right.submittedAt - left.submittedAt;
			}
		} else {
			const leftIndex = orderIndex.get(left.playerId);
			const rightIndex = orderIndex.get(right.playerId);
			if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
				return leftIndex - rightIndex;
			}
		}

		return left.playerId.localeCompare(right.playerId);
	};

	return [...bids].sort((left, right) => {
		if (left.amount !== right.amount) {
			return right.amount - left.amount;
		}

		return compareForTie(left, right);
	});
};

export class SealedAuction<TPlayerId extends string> {
	private readonly id: string;
	private readonly allowedBidders: readonly TPlayerId[] | null;
	private readonly allowBidUpdate: boolean;
	private readonly reservePrice: number | null;
	private readonly tieBreaker: AuctionTieBreaker;
	private readonly playerOrder: readonly TPlayerId[];
	private readonly bids = new Map<TPlayerId, AuctionBid<TPlayerId>>();
	private status: AuctionStatus = 'open';
	private closedAt: number | undefined;

	constructor(options: SealedAuctionOptions<TPlayerId>) {
		if (!options.id.trim()) {
			throw new TypeError('Auction id is required');
		}

		this.id = options.id;
		this.allowedBidders = options.allowedBidders ? [...options.allowedBidders] : null;
		this.allowBidUpdate = options.allowBidUpdate ?? true;
		this.tieBreaker = normalizeTieBreaker(options.tieBreaker);
		this.playerOrder = options.playerOrder ? [...options.playerOrder] : [];

		if (options.reservePrice !== undefined) {
			assertNonNegativeInteger(options.reservePrice, 'Reserve price');
			this.reservePrice = options.reservePrice;
		} else {
			this.reservePrice = null;
		}
	}

	get auctionId(): string {
		return this.id;
	}

	get auctionStatus(): AuctionStatus {
		return this.status;
	}

	listBids(): readonly AuctionBid<TPlayerId>[] {
		return [...this.bids.values()];
	}

	submitBid(playerId: TPlayerId, amount: number, submittedAt: number = Date.now()): AuctionBid<TPlayerId> {
		if (this.status !== 'open') {
			throw new Error(`Auction ${this.id} is not open`);
		}

		if (this.allowedBidders && !this.allowedBidders.includes(playerId)) {
			throw new Error(`Player ${playerId} is not allowed to bid in auction ${this.id}`);
		}

		assertNonNegativeInteger(amount, 'Bid amount');
		assertFiniteTimestamp(submittedAt, 'Bid timestamp');

		const previousBid = this.bids.get(playerId);
		if (previousBid && !this.allowBidUpdate) {
			throw new Error(`Player ${playerId} already placed a bid in auction ${this.id}`);
		}

		const bid: AuctionBid<TPlayerId> = {
			playerId,
			amount,
			submittedAt,
		};

		this.bids.set(playerId, bid);
		return bid;
	}

	close(closedAt: number = Date.now()): SealedAuctionResolution<TPlayerId> {
		if (this.status !== 'open') {
			throw new Error(`Auction ${this.id} is already closed`);
		}

		assertFiniteTimestamp(closedAt, 'Auction close timestamp');
		this.status = 'closed';
		this.closedAt = closedAt;

		const rankedBids = this.getRankedBids();
		const winner = this.pickWinner(rankedBids);

		return {
			status: 'closed',
			closedAt,
			winnerId: winner?.playerId,
			winningBid: winner?.amount,
			rankedBids,
		};
	}

	projectForViewer(
		viewer: AuctionViewer<TPlayerId>,
		options: SealedAuctionProjectionOptions = {}
	): SealedAuctionProjection<TPlayerId> {
		const revealBidsWhenClosed = options.revealBidsWhenClosed ?? true;
		const playerId = viewer.kind === 'player' ? viewer.playerId : undefined;
		const playerBid = playerId ? this.bids.get(playerId) : undefined;

		const rankedBids = this.getRankedBids();
		const winner = this.status === 'closed' ? this.pickWinner(rankedBids) : undefined;

		return {
			id: this.id,
			status: this.status,
			bidCount: this.bids.size,
			canBid: this.status === 'open' && this.isAllowedBidder(playerId),
			yourBid: playerBid?.amount ?? null,
			winnerId: winner?.playerId,
			winningBid: winner?.amount,
			revealedBids: this.status === 'closed' && revealBidsWhenClosed ? rankedBids : null,
		};
	}

	toSnapshot(): SealedAuctionSnapshot<TPlayerId> {
		return {
			id: this.id,
			status: this.status,
			closedAt: this.closedAt,
			bids: this.listBids(),
			options: {
				allowedBidders: this.allowedBidders ?? undefined,
				allowBidUpdate: this.allowBidUpdate,
				reservePrice: this.reservePrice ?? undefined,
				tieBreaker: this.tieBreaker,
				playerOrder: this.playerOrder,
			},
		};
	}

	static fromSnapshot<TPlayerId extends string>(snapshot: SealedAuctionSnapshot<TPlayerId>): SealedAuction<TPlayerId> {
		const auction = new SealedAuction<TPlayerId>({
			id: snapshot.id,
			...snapshot.options,
		});

		for (const bid of snapshot.bids) {
			auction.bids.set(bid.playerId, bid);
		}

		auction.status = snapshot.status;
		auction.closedAt = snapshot.closedAt;
		return auction;
	}

	private isAllowedBidder(playerId: TPlayerId | undefined): boolean {
		if (!playerId) {
			return false;
		}

		if (!this.allowedBidders) {
			return true;
		}

		return this.allowedBidders.includes(playerId);
	}

	private getRankedBids(): readonly AuctionBid<TPlayerId>[] {
		return sortBids(this.listBids(), this.tieBreaker, this.playerOrder);
	}

	private pickWinner(rankedBids: readonly AuctionBid<TPlayerId>[]): AuctionBid<TPlayerId> | undefined {
		if (rankedBids.length === 0) {
			return undefined;
		}

		const candidate = rankedBids[0];
		if (!candidate) {
			return undefined;
		}

		if (this.reservePrice !== null && candidate.amount < this.reservePrice) {
			return undefined;
		}

		return candidate;
	}
}
