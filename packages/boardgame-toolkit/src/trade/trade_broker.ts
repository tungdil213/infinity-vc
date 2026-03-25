import type { ResourceBank } from '../resources/resource_bank.js';

export type TradeTarget<TPlayerId extends string> = 'all' | readonly TPlayerId[];

export type TradeOfferStatus = 'open' | 'accepted' | 'cancelled';

export type ResourceVector<TResource extends string> = Partial<Record<TResource, number>>;

export interface TradeOffer<TPlayerId extends string, TResource extends string> {
	readonly id: string;
	readonly fromPlayerId: TPlayerId;
	readonly target: TradeTarget<TPlayerId>;
	readonly give: ResourceVector<TResource>;
	readonly receive: ResourceVector<TResource>;
	readonly status: TradeOfferStatus;
	readonly acceptedBy?: TPlayerId;
	readonly createdAt: number;
}

export interface TradeBrokerSnapshot<TPlayerId extends string, TResource extends string> {
	readonly offers: readonly TradeOffer<TPlayerId, TResource>[];
	readonly sequence: number;
}

export interface BankTradeOptions<TResource extends string> {
	readonly defaultRate?: number;
	readonly rateByGivenResource?: Partial<Record<TResource, number>>;
}

const toPositiveIntegerMap = <TResource extends string>(
	resources: ResourceVector<TResource>,
	label: string
): ResourceVector<TResource> => {
	const normalized = {} as ResourceVector<TResource>;

	for (const [resourceId, amount] of Object.entries(resources) as [TResource, number][]) {
		if (!Number.isInteger(amount) || amount < 0) {
			throw new TypeError(`${label} amount for ${resourceId} must be a non-negative integer`);
		}

		if (amount === 0) {
			continue;
		}

		normalized[resourceId] = amount;
	}

	return normalized;
};

const totalUnits = <TResource extends string>(resources: ResourceVector<TResource>): number => {
	let total = 0;

	for (const amount of Object.values(resources) as (number | undefined)[]) {
		total += amount ?? 0;
	}

	return total;
};

export class TradeBroker<TPlayerId extends string, TResource extends string> {
	private readonly offers = new Map<string, TradeOffer<TPlayerId, TResource>>();
	private sequence = 1;

	openOffer(
		fromPlayerId: TPlayerId,
		target: TradeTarget<TPlayerId>,
		give: ResourceVector<TResource>,
		receive: ResourceVector<TResource>,
		createdAt: number = Date.now()
	): TradeOffer<TPlayerId, TResource> {
		if (!Number.isFinite(createdAt)) {
			throw new TypeError('Offer timestamp must be finite');
		}

		if (target !== 'all' && target.length === 0) {
			throw new TypeError('Trade target list cannot be empty');
		}

		const normalizedGive = toPositiveIntegerMap(give, 'Give');
		const normalizedReceive = toPositiveIntegerMap(receive, 'Receive');

		if (totalUnits(normalizedGive) === 0 || totalUnits(normalizedReceive) === 0) {
			throw new Error('Trade offers must include both give and receive resources');
		}

		const offer: TradeOffer<TPlayerId, TResource> = {
			id: `offer-${this.sequence}`,
			fromPlayerId,
			target: target === 'all' ? 'all' : [...target],
			give: normalizedGive,
			receive: normalizedReceive,
			status: 'open',
			createdAt,
		};

		this.sequence += 1;
		this.offers.set(offer.id, offer);
		return offer;
	}

	listOffers(status?: TradeOfferStatus): readonly TradeOffer<TPlayerId, TResource>[] {
		const offers = [...this.offers.values()];

		if (!status) {
			return offers;
		}

		return offers.filter((offer) => offer.status === status);
	}

	getOffer(offerId: string): TradeOffer<TPlayerId, TResource> {
		const offer = this.offers.get(offerId);
		if (!offer) {
			throw new Error(`Unknown trade offer: ${offerId}`);
		}

		return offer;
	}

	cancelOffer(offerId: string, byPlayerId: TPlayerId): TradeOffer<TPlayerId, TResource> {
		const offer = this.getOffer(offerId);

		if (offer.fromPlayerId !== byPlayerId) {
			throw new Error(`Player ${byPlayerId} cannot cancel offer ${offerId}`);
		}

		if (offer.status !== 'open') {
			throw new Error(`Offer ${offerId} is not open`);
		}

		const cancelled: TradeOffer<TPlayerId, TResource> = {
			...offer,
			status: 'cancelled',
		};

		this.offers.set(offerId, cancelled);
		return cancelled;
	}

	acceptOffer(offerId: string, byPlayerId: TPlayerId, bank: ResourceBank): TradeOffer<TPlayerId, TResource> {
		const offer = this.getOffer(offerId);

		if (offer.status !== 'open') {
			throw new Error(`Offer ${offerId} is not open`);
		}

		if (offer.fromPlayerId === byPlayerId) {
			throw new Error('Player cannot accept their own offer');
		}

		if (offer.target !== 'all' && !offer.target.includes(byPlayerId)) {
			throw new Error(`Player ${byPlayerId} is not an allowed target for offer ${offerId}`);
		}

		bank.transfer(offer.fromPlayerId, byPlayerId, offer.give as Record<string, number>);
		bank.transfer(byPlayerId, offer.fromPlayerId, offer.receive as Record<string, number>);

		const accepted: TradeOffer<TPlayerId, TResource> = {
			...offer,
			status: 'accepted',
			acceptedBy: byPlayerId,
		};

		this.offers.set(offerId, accepted);
		return accepted;
	}

	bankTrade(
		playerId: TPlayerId,
		give: ResourceVector<TResource>,
		receive: ResourceVector<TResource>,
		bank: ResourceBank,
		options: BankTradeOptions<TResource> = {}
	): this {
		const defaultRate = options.defaultRate ?? 4;
		if (!Number.isInteger(defaultRate) || defaultRate < 1) {
			throw new TypeError('Bank trade defaultRate must be a positive integer');
		}

		const normalizedGive = toPositiveIntegerMap(give, 'Give');
		const normalizedReceive = toPositiveIntegerMap(receive, 'Receive');

		if (totalUnits(normalizedGive) === 0 || totalUnits(normalizedReceive) === 0) {
			throw new Error('Bank trade requires both give and receive resources');
		}

		let convertedUnits = 0;
		for (const [resourceId, amount] of Object.entries(normalizedGive) as [TResource, number][]) {
			const rate = options.rateByGivenResource?.[resourceId] ?? defaultRate;
			if (!Number.isInteger(rate) || rate < 1) {
				throw new TypeError(`Invalid bank trade rate for ${resourceId}`);
			}

			if (amount % rate !== 0) {
				throw new Error(`Resource ${resourceId} amount ${amount} is not divisible by rate ${rate}`);
			}

			convertedUnits += amount / rate;
		}

		const requestedUnits = totalUnits(normalizedReceive);
		if (convertedUnits !== requestedUnits) {
			throw new Error(`Bank trade conversion mismatch: ${convertedUnits} converted vs ${requestedUnits} requested`);
		}

		bank.spend(playerId, normalizedGive as Record<string, number>);
		for (const [resourceId, amount] of Object.entries(normalizedReceive) as [string, number][]) {
			bank.grant(playerId, resourceId, amount);
		}

		return this;
	}

	toSnapshot(): TradeBrokerSnapshot<TPlayerId, TResource> {
		return {
			offers: this.listOffers(),
			sequence: this.sequence,
		};
	}

	static fromSnapshot<TPlayerId extends string, TResource extends string>(
		snapshot: TradeBrokerSnapshot<TPlayerId, TResource>
	): TradeBroker<TPlayerId, TResource> {
		const broker = new TradeBroker<TPlayerId, TResource>();
		broker.sequence = snapshot.sequence;

		for (const offer of snapshot.offers) {
			broker.offers.set(offer.id, offer);
		}

		return broker;
	}
}
