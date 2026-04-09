export type DraftDirection = 'left' | 'right';

export interface RotatingDraftSnapshot<TPlayerId extends string, TCard> {
	readonly direction: DraftDirection;
	readonly round: number;
	readonly alternateDirectionPerRound: boolean;
	readonly hands: Record<TPlayerId, readonly TCard[]>;
	readonly drafted: Record<TPlayerId, readonly TCard[]>;
	readonly pendingPicks: Partial<Record<TPlayerId, TCard>>;
}

type CardMatcher<TCard> = TCard | ((card: TCard) => boolean);

export class RotatingDraft<TPlayerId extends string, TCard> {
	private readonly order: TPlayerId[];
	private readonly hands = new Map<TPlayerId, TCard[]>();
	private readonly drafted = new Map<TPlayerId, TCard[]>();
	private readonly pendingPicks = new Map<TPlayerId, TCard>();
	private direction: DraftDirection;
	private round = 1;

	constructor(
		handsByPlayer: Record<TPlayerId, readonly TCard[]>,
		options: {
			direction?: DraftDirection;
			alternateDirectionPerRound?: boolean;
		} = {}
	) {
		this.order = Object.keys(handsByPlayer) as TPlayerId[];

		if (this.order.length < 2) {
			throw new Error('RotatingDraft requires at least two players');
		}

		this.direction = options.direction ?? 'left';
		this.alternateDirectionPerRound = options.alternateDirectionPerRound ?? false;

		for (const playerId of this.order) {
			this.hands.set(playerId, [...handsByPlayer[playerId]]);
			this.drafted.set(playerId, []);
		}
	}

	private readonly alternateDirectionPerRound: boolean;

	players(): readonly TPlayerId[] {
		return [...this.order];
	}

	currentDirection(): DraftDirection {
		return this.direction;
	}

	currentRound(): number {
		return this.round;
	}

	hand(playerId: TPlayerId): readonly TCard[] {
		return [...this.getHand(playerId)];
	}

	draftedCards(playerId: TPlayerId): readonly TCard[] {
		return [...(this.drafted.get(playerId) ?? [])];
	}

	pendingPick(playerId: TPlayerId): TCard | undefined {
		return this.pendingPicks.get(playerId);
	}

	isComplete(): boolean {
		return this.order.every((playerId) => this.getHand(playerId).length === 0);
	}

	pick(playerId: TPlayerId, matcher: CardMatcher<TCard>): TCard {
		this.assertKnownPlayer(playerId);

		if (this.pendingPicks.has(playerId)) {
			throw new Error(`Player ${playerId} already made a pick this round`);
		}

		const hand = this.getHand(playerId);
		const cardIndex = this.findCardIndex(hand, matcher);

		if (cardIndex < 0) {
			throw new Error(`Card not found in hand for player ${playerId}`);
		}

		const selected = hand[cardIndex] as TCard;
		this.pendingPicks.set(playerId, selected);
		return selected;
	}

	resolveRound(): this {
		const activePlayers = this.order.filter((playerId) => this.getHand(playerId).length > 0);

		if (activePlayers.length === 0) {
			return this;
		}

		for (const playerId of activePlayers) {
			if (!this.pendingPicks.has(playerId)) {
				throw new Error(`Missing pending pick for player ${playerId}`);
			}
		}

		for (const playerId of activePlayers) {
			const selected = this.pendingPicks.get(playerId) as TCard;
			this.removeCardFromHand(playerId, selected);
			(this.drafted.get(playerId) as TCard[]).push(selected);
		}

		this.pendingPicks.clear();
		this.rotateHands(activePlayers);

		this.round += 1;
		if (this.alternateDirectionPerRound) {
			this.direction = this.direction === 'left' ? 'right' : 'left';
		}

		return this;
	}

	toSnapshot(): RotatingDraftSnapshot<TPlayerId, TCard> {
		const hands = {} as Record<TPlayerId, readonly TCard[]>;
		const drafted = {} as Record<TPlayerId, readonly TCard[]>;

		for (const playerId of this.order) {
			hands[playerId] = [...this.getHand(playerId)];
			drafted[playerId] = [...(this.drafted.get(playerId) as TCard[])];
		}

		const pendingPicks: Partial<Record<TPlayerId, TCard>> = {};
		for (const [playerId, card] of this.pendingPicks.entries()) {
			pendingPicks[playerId] = card;
		}

		return {
			direction: this.direction,
			round: this.round,
			alternateDirectionPerRound: this.alternateDirectionPerRound,
			hands,
			drafted,
			pendingPicks,
		};
	}

	static fromSnapshot<TPlayerId extends string, TCard>(
		snapshot: RotatingDraftSnapshot<TPlayerId, TCard>
	): RotatingDraft<TPlayerId, TCard> {
		const draft = new RotatingDraft(snapshot.hands as Record<TPlayerId, readonly TCard[]>, {
			direction: snapshot.direction,
			alternateDirectionPerRound: snapshot.alternateDirectionPerRound,
		});

		draft.round = snapshot.round;

		for (const playerId of draft.order) {
			draft.drafted.set(playerId, [...snapshot.drafted[playerId]]);
		}

		draft.pendingPicks.clear();
		for (const [playerId, card] of Object.entries(snapshot.pendingPicks) as [TPlayerId, TCard][]) {
			draft.pendingPicks.set(playerId, card);
		}

		return draft;
	}

	private rotateHands(activePlayers: TPlayerId[]): void {
		if (activePlayers.length < 2) {
			return;
		}

		const rotated = new Map<TPlayerId, TCard[]>();

		for (let index = 0; index < activePlayers.length; index += 1) {
			const playerId = activePlayers[index] as TPlayerId;
			const donorIndex =
				this.direction === 'left'
					? (index + 1) % activePlayers.length
					: (index - 1 + activePlayers.length) % activePlayers.length;
			const donor = activePlayers[donorIndex] as TPlayerId;
			rotated.set(playerId, [...this.getHand(donor)]);
		}

		for (const [playerId, cards] of rotated.entries()) {
			this.hands.set(playerId, cards);
		}
	}

	private removeCardFromHand(playerId: TPlayerId, card: TCard): void {
		const hand = this.getHand(playerId);
		const index = hand.findIndex((candidate) => candidate === card);

		if (index < 0) {
			throw new Error(`Selected card missing from hand for player ${playerId}`);
		}

		hand.splice(index, 1);
	}

	private findCardIndex(hand: readonly TCard[], matcher: CardMatcher<TCard>): number {
		if (typeof matcher === 'function') {
			return hand.findIndex((card) => (matcher as (candidate: TCard) => boolean)(card));
		}

		return hand.findIndex((card) => card === matcher);
	}

	private getHand(playerId: TPlayerId): TCard[] {
		this.assertKnownPlayer(playerId);
		return this.hands.get(playerId) as TCard[];
	}

	private assertKnownPlayer(playerId: TPlayerId): void {
		if (!this.hands.has(playerId)) {
			throw new Error(`Unknown player: ${playerId}`);
		}
	}
}
