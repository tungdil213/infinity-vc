export type VoteSessionStatus = 'open' | 'closed';

export type VoteAudience = 'public' | 'spectator' | 'player';

export interface VoteViewer<TPlayerId extends string> {
	readonly kind: VoteAudience;
	readonly playerId?: TPlayerId;
}

export interface VoteBallot<TPlayerId extends string, TOptionId extends string> {
	readonly playerId: TPlayerId;
	readonly optionId: TOptionId;
	readonly weight: number;
	readonly submittedAt: number;
}

export interface VoteSessionOptions<TPlayerId extends string, TOptionId extends string> {
	readonly id: string;
	readonly optionIds: readonly TOptionId[];
	readonly allowedVoters?: readonly TPlayerId[];
	readonly allowRevote?: boolean;
	readonly ballotSecret?: boolean;
	readonly revealTallyDuringVoting?: boolean;
	readonly revealBallotsOnClose?: boolean;
}

export interface VoteSessionResult<TOptionId extends string> {
	readonly status: 'closed';
	readonly closedAt: number;
	readonly tally: Record<TOptionId, number>;
	readonly winnerOptionIds: readonly TOptionId[];
	readonly turnout: number;
	readonly totalWeight: number;
}

export interface VoteSessionProjection<TPlayerId extends string, TOptionId extends string> {
	readonly id: string;
	readonly status: VoteSessionStatus;
	readonly optionIds: readonly TOptionId[];
	readonly turnout: number;
	readonly totalVoters: number | null;
	readonly canVote: boolean;
	readonly yourVote: TOptionId | null;
	readonly tally: Record<TOptionId, number> | null;
	readonly ballots: readonly VoteBallot<TPlayerId, TOptionId>[] | null;
	readonly winnerOptionIds: readonly TOptionId[] | null;
}

export interface VoteSessionSnapshot<TPlayerId extends string, TOptionId extends string> {
	readonly id: string;
	readonly status: VoteSessionStatus;
	readonly closedAt?: number;
	readonly optionIds: readonly TOptionId[];
	readonly ballots: readonly VoteBallot<TPlayerId, TOptionId>[];
	readonly options: Omit<VoteSessionOptions<TPlayerId, TOptionId>, 'id' | 'optionIds'>;
}

const assertFiniteTimestamp = (value: number, label: string): void => {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${label} must be finite`);
	}
};

const assertPositiveInteger = (value: number, label: string): void => {
	if (!Number.isInteger(value) || value < 1) {
		throw new TypeError(`${label} must be a positive integer`);
	}
};

const computeWinners = <TOptionId extends string>(tally: Record<TOptionId, number>): readonly TOptionId[] => {
	const entries = Object.entries(tally) as [TOptionId, number][];
	if (entries.length === 0) {
		return [];
	}

	let highest = Number.NEGATIVE_INFINITY;
	for (const [, amount] of entries) {
		if (amount > highest) {
			highest = amount;
		}
	}

	return entries.filter(([, amount]) => amount === highest).map(([optionId]) => optionId);
};

export class VoteSession<TPlayerId extends string, TOptionId extends string> {
	private readonly id: string;
	private readonly optionIds: readonly TOptionId[];
	private readonly optionSet: ReadonlySet<TOptionId>;
	private readonly allowedVoters: readonly TPlayerId[] | null;
	private readonly allowRevote: boolean;
	private readonly ballotSecret: boolean;
	private readonly revealTallyDuringVoting: boolean;
	private readonly revealBallotsOnClose: boolean;
	private readonly ballots = new Map<TPlayerId, VoteBallot<TPlayerId, TOptionId>>();
	private status: VoteSessionStatus = 'open';
	private closedAt: number | undefined;

	constructor(options: VoteSessionOptions<TPlayerId, TOptionId>) {
		if (!options.id.trim()) {
			throw new TypeError('Vote session id is required');
		}

		if (options.optionIds.length === 0) {
			throw new TypeError('Vote session requires at least one option');
		}

		this.id = options.id;
		this.optionIds = [...options.optionIds];
		this.optionSet = new Set(options.optionIds);
		this.allowedVoters = options.allowedVoters ? [...options.allowedVoters] : null;
		this.allowRevote = options.allowRevote ?? true;
		this.ballotSecret = options.ballotSecret ?? true;
		this.revealTallyDuringVoting = options.revealTallyDuringVoting ?? false;
		this.revealBallotsOnClose = options.revealBallotsOnClose ?? false;
	}

	get voteSessionId(): string {
		return this.id;
	}

	get voteSessionStatus(): VoteSessionStatus {
		return this.status;
	}

	listBallots(): readonly VoteBallot<TPlayerId, TOptionId>[] {
		return [...this.ballots.values()];
	}

	castVote(
		playerId: TPlayerId,
		optionId: TOptionId,
		weight: number = 1,
		submittedAt: number = Date.now()
	): VoteBallot<TPlayerId, TOptionId> {
		if (this.status !== 'open') {
			throw new Error(`Vote session ${this.id} is not open`);
		}

		if (!this.optionSet.has(optionId)) {
			throw new Error(`Unknown vote option: ${optionId}`);
		}

		if (this.allowedVoters && !this.allowedVoters.includes(playerId)) {
			throw new Error(`Player ${playerId} is not allowed in vote session ${this.id}`);
		}

		assertPositiveInteger(weight, 'Vote weight');
		assertFiniteTimestamp(submittedAt, 'Vote timestamp');

		if (!this.allowRevote && this.ballots.has(playerId)) {
			throw new Error(`Player ${playerId} already voted in session ${this.id}`);
		}

		const ballot: VoteBallot<TPlayerId, TOptionId> = {
			playerId,
			optionId,
			weight,
			submittedAt,
		};

		this.ballots.set(playerId, ballot);
		return ballot;
	}

	close(closedAt: number = Date.now()): VoteSessionResult<TOptionId> {
		if (this.status !== 'open') {
			throw new Error(`Vote session ${this.id} is already closed`);
		}

		assertFiniteTimestamp(closedAt, 'Vote close timestamp');
		this.status = 'closed';
		this.closedAt = closedAt;

		const tally = this.getTally();
		let totalWeight = 0;
		for (const optionId of this.optionIds) {
			totalWeight += tally[optionId];
		}

		return {
			status: 'closed',
			closedAt,
			tally,
			winnerOptionIds: computeWinners(tally),
			turnout: this.ballots.size,
			totalWeight,
		};
	}

	projectForViewer(viewer: VoteViewer<TPlayerId>): VoteSessionProjection<TPlayerId, TOptionId> {
		const playerId = viewer.kind === 'player' ? viewer.playerId : undefined;
		const ownBallot = playerId ? this.ballots.get(playerId) : undefined;
		const tallyVisible = !this.ballotSecret || this.status === 'closed' || this.revealTallyDuringVoting;
		const ballotsVisible = !this.ballotSecret || (this.status === 'closed' && this.revealBallotsOnClose);
		const tally = this.getTally();

		return {
			id: this.id,
			status: this.status,
			optionIds: this.optionIds,
			turnout: this.ballots.size,
			totalVoters: this.allowedVoters?.length ?? null,
			canVote: this.status === 'open' && this.isAllowedVoter(playerId),
			yourVote: ownBallot?.optionId ?? null,
			tally: tallyVisible ? tally : null,
			ballots: ballotsVisible ? this.listBallots() : null,
			winnerOptionIds: this.status === 'closed' && tallyVisible ? computeWinners(tally) : null,
		};
	}

	toSnapshot(): VoteSessionSnapshot<TPlayerId, TOptionId> {
		return {
			id: this.id,
			status: this.status,
			closedAt: this.closedAt,
			optionIds: this.optionIds,
			ballots: this.listBallots(),
			options: {
				allowedVoters: this.allowedVoters ?? undefined,
				allowRevote: this.allowRevote,
				ballotSecret: this.ballotSecret,
				revealTallyDuringVoting: this.revealTallyDuringVoting,
				revealBallotsOnClose: this.revealBallotsOnClose,
			},
		};
	}

	static fromSnapshot<TPlayerId extends string, TOptionId extends string>(
		snapshot: VoteSessionSnapshot<TPlayerId, TOptionId>
	): VoteSession<TPlayerId, TOptionId> {
		const session = new VoteSession<TPlayerId, TOptionId>({
			id: snapshot.id,
			optionIds: snapshot.optionIds,
			...snapshot.options,
		});

		for (const ballot of snapshot.ballots) {
			session.ballots.set(ballot.playerId, ballot);
		}

		session.status = snapshot.status;
		session.closedAt = snapshot.closedAt;
		return session;
	}

	private getTally(): Record<TOptionId, number> {
		const tally = {} as Record<TOptionId, number>;
		for (const optionId of this.optionIds) {
			tally[optionId] = 0;
		}

		for (const ballot of this.ballots.values()) {
			tally[ballot.optionId] += ballot.weight;
		}

		return tally;
	}

	private isAllowedVoter(playerId: TPlayerId | undefined): boolean {
		if (!playerId) {
			return false;
		}

		if (!this.allowedVoters) {
			return true;
		}

		return this.allowedVoters.includes(playerId);
	}
}
