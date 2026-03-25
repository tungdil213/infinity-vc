export type SimultaneousRoundStatus = 'open' | 'locked' | 'resolved';

export interface SimultaneousRoundSnapshot<TPlayerId extends string, TChoice> {
	readonly players: readonly TPlayerId[];
	readonly status: SimultaneousRoundStatus;
	readonly submissions: Partial<Record<TPlayerId, TChoice>>;
	readonly allowOverride: boolean;
	readonly requireAllBeforeLock: boolean;
}

export interface SimultaneousRoundStatusView<TPlayerId extends string> {
	readonly status: SimultaneousRoundStatus;
	readonly submittedCount: number;
	readonly missingPlayers: readonly TPlayerId[];
}

export interface SimultaneousResolution<TPlayerId extends string, TChoice> {
	readonly byPlayer: Record<TPlayerId, TChoice>;
	readonly ordered: readonly { playerId: TPlayerId; choice: TChoice }[];
}

export interface SimultaneousRoundOptions {
	readonly allowOverride?: boolean;
	readonly requireAllBeforeLock?: boolean;
}

export class CommitRevealRound<TPlayerId extends string, TChoice> {
	private readonly players: TPlayerId[];
	private readonly submissions = new Map<TPlayerId, TChoice>();
	private status: SimultaneousRoundStatus = 'open';
	private readonly allowOverride: boolean;
	private readonly requireAllBeforeLock: boolean;

	constructor(players: readonly TPlayerId[], options: SimultaneousRoundOptions = {}) {
		if (players.length === 0) {
			throw new TypeError('CommitRevealRound requires at least one player');
		}

		this.players = [...players];
		this.allowOverride = options.allowOverride ?? true;
		this.requireAllBeforeLock = options.requireAllBeforeLock ?? true;
	}

	playerOrder(): readonly TPlayerId[] {
		return [...this.players];
	}

	currentStatus(): SimultaneousRoundStatus {
		return this.status;
	}

	hasSubmitted(playerId: TPlayerId): boolean {
		this.assertKnownPlayer(playerId);
		return this.submissions.has(playerId);
	}

	submit(playerId: TPlayerId, choice: TChoice): this {
		this.assertKnownPlayer(playerId);

		if (this.status !== 'open') {
			throw new Error('Cannot submit choice when round is not open');
		}

		if (!this.allowOverride && this.submissions.has(playerId)) {
			throw new Error(`Player ${playerId} already submitted a choice`);
		}

		this.submissions.set(playerId, choice);
		return this;
	}

	missingPlayers(): readonly TPlayerId[] {
		return this.players.filter((playerId) => !this.submissions.has(playerId));
	}

	lock(): this {
		if (this.status !== 'open') {
			throw new Error('Round can only be locked from open state');
		}

		if (this.requireAllBeforeLock && this.missingPlayers().length > 0) {
			throw new Error('Cannot lock round before all players submit their choices');
		}

		this.status = 'locked';
		return this;
	}

	revealAll(): Record<TPlayerId, TChoice> {
		if (this.status === 'open') {
			throw new Error('Cannot reveal choices before lock');
		}

		return this.asSubmissionRecord();
	}

	resolve(order: readonly TPlayerId[] = this.players): SimultaneousResolution<TPlayerId, TChoice> {
		if (this.status === 'open') {
			throw new Error('Cannot resolve round before lock');
		}

		const byPlayer = this.asSubmissionRecord();
		const ordered = order.map((playerId) => {
			this.assertKnownPlayer(playerId);

			const choice = this.submissions.get(playerId);
			if (choice === undefined) {
				throw new Error(`Missing choice for player ${playerId}`);
			}

			return {
				playerId,
				choice,
			};
		});

		this.status = 'resolved';

		return {
			byPlayer,
			ordered,
		};
	}

	reset(): this {
		this.submissions.clear();
		this.status = 'open';
		return this;
	}

	statusView(): SimultaneousRoundStatusView<TPlayerId> {
		return {
			status: this.status,
			submittedCount: this.submissions.size,
			missingPlayers: this.missingPlayers(),
		};
	}

	toSnapshot(): SimultaneousRoundSnapshot<TPlayerId, TChoice> {
		return {
			players: [...this.players],
			status: this.status,
			submissions: Object.fromEntries(this.submissions.entries()) as Partial<Record<TPlayerId, TChoice>>,
			allowOverride: this.allowOverride,
			requireAllBeforeLock: this.requireAllBeforeLock,
		};
	}

	static fromSnapshot<TPlayerId extends string, TChoice>(
		snapshot: SimultaneousRoundSnapshot<TPlayerId, TChoice>
	): CommitRevealRound<TPlayerId, TChoice> {
		const round = new CommitRevealRound<TPlayerId, TChoice>(snapshot.players, {
			allowOverride: snapshot.allowOverride,
			requireAllBeforeLock: snapshot.requireAllBeforeLock,
		});

		for (const [playerId, choice] of Object.entries(snapshot.submissions) as [TPlayerId, TChoice][]) {
			round.submissions.set(playerId, choice);
		}

		round.status = snapshot.status;
		return round;
	}

	private asSubmissionRecord(): Record<TPlayerId, TChoice> {
		const record = {} as Record<TPlayerId, TChoice>;

		for (const playerId of this.players) {
			const choice = this.submissions.get(playerId);
			if (choice === undefined) {
				throw new Error(`Missing choice for player ${playerId}`);
			}

			record[playerId] = choice;
		}

		return record;
	}

	private assertKnownPlayer(playerId: TPlayerId): void {
		if (!this.players.includes(playerId)) {
			throw new Error(`Unknown player: ${playerId}`);
		}
	}
}
