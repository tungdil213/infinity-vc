export interface GameClockSnapshot<TPlayerId extends string> {
	readonly incrementMs: number;
	readonly remainingByPlayer: Record<TPlayerId, number>;
	readonly activePlayer: TPlayerId | null;
}

export class GameClock<TPlayerId extends string> {
	private readonly orderedPlayers: TPlayerId[];
	private readonly remainingByPlayer = new Map<TPlayerId, number>();
	private activePlayer: TPlayerId | null = null;
	private activeSinceMs: number | null = null;

	constructor(
		playerIds: readonly TPlayerId[],
		startingMs: number,
		private readonly incrementMs: number = 0
	) {
		if (playerIds.length === 0) {
			throw new Error('GameClock requires at least one player');
		}

		this.assertNonNegativeInteger(startingMs, 'startingMs');
		this.assertNonNegativeInteger(incrementMs, 'incrementMs');

		this.orderedPlayers = [...playerIds];
		for (const playerId of playerIds) {
			this.remainingByPlayer.set(playerId, startingMs);
		}
	}

	players(): readonly TPlayerId[] {
		return [...this.orderedPlayers];
	}

	currentPlayer(): TPlayerId | null {
		return this.activePlayer;
	}

	start(playerId: TPlayerId, nowMs: number = Date.now()): this {
		this.assertKnownPlayer(playerId);
		this.assertTime(nowMs);

		if (this.activePlayer) {
			throw new Error('Clock already started; use switchTo or pause first');
		}

		this.activePlayer = playerId;
		this.activeSinceMs = nowMs;
		return this;
	}

	switchTo(playerId: TPlayerId, nowMs: number = Date.now()): this {
		this.assertKnownPlayer(playerId);
		this.assertTime(nowMs);

		if (!this.activePlayer) {
			return this.start(playerId, nowMs);
		}

		if (this.activePlayer === playerId) {
			return this;
		}

		this.consumeElapsedForActive(nowMs);

		const previousPlayer = this.activePlayer;
		const previousRemaining = this.remainingByPlayer.get(previousPlayer) as number;
		this.remainingByPlayer.set(previousPlayer, previousRemaining + this.incrementMs);

		this.activePlayer = playerId;
		this.activeSinceMs = nowMs;
		return this;
	}

	pause(nowMs: number = Date.now()): this {
		this.assertTime(nowMs);

		if (!this.activePlayer) {
			return this;
		}

		this.consumeElapsedForActive(nowMs);
		this.activePlayer = null;
		this.activeSinceMs = null;
		return this;
	}

	remaining(playerId: TPlayerId, nowMs: number = Date.now()): number {
		this.assertKnownPlayer(playerId);
		this.assertTime(nowMs);

		const base = this.remainingByPlayer.get(playerId) as number;

		if (this.activePlayer !== playerId || this.activeSinceMs === null) {
			return base;
		}

		const elapsed = Math.max(0, nowMs - this.activeSinceMs);
		return Math.max(0, base - elapsed);
	}

	isFlagged(playerId: TPlayerId, nowMs: number = Date.now()): boolean {
		return this.remaining(playerId, nowMs) <= 0;
	}

	flaggedPlayers(nowMs: number = Date.now()): TPlayerId[] {
		return this.orderedPlayers.filter((playerId) => this.isFlagged(playerId, nowMs));
	}

	toSnapshot(nowMs: number = Date.now()): GameClockSnapshot<TPlayerId> {
		this.assertTime(nowMs);

		const remainingByPlayer = Object.fromEntries(
			this.orderedPlayers.map((playerId) => [playerId, this.remaining(playerId, nowMs)])
		) as Record<TPlayerId, number>;

		return {
			incrementMs: this.incrementMs,
			remainingByPlayer,
			activePlayer: this.activePlayer,
		};
	}

	static fromSnapshot<TPlayerId extends string>(
		snapshot: GameClockSnapshot<TPlayerId>,
		nowMs: number = Date.now()
	): GameClock<TPlayerId> {
		const players = Object.keys(snapshot.remainingByPlayer) as TPlayerId[];
		const clock = new GameClock(players, 0, snapshot.incrementMs);

		for (const playerId of players) {
			clock.remainingByPlayer.set(playerId, snapshot.remainingByPlayer[playerId]);
		}

		if (snapshot.activePlayer) {
			clock.start(snapshot.activePlayer, nowMs);
		}

		return clock;
	}

	private consumeElapsedForActive(nowMs: number): void {
		if (!this.activePlayer || this.activeSinceMs === null) {
			return;
		}

		const elapsed = Math.max(0, nowMs - this.activeSinceMs);
		const remaining = this.remainingByPlayer.get(this.activePlayer) as number;

		this.remainingByPlayer.set(this.activePlayer, Math.max(0, remaining - elapsed));
		this.activeSinceMs = nowMs;
	}

	private assertKnownPlayer(playerId: TPlayerId): void {
		if (!this.remainingByPlayer.has(playerId)) {
			throw new Error(`Unknown player: ${playerId}`);
		}
	}

	private assertNonNegativeInteger(value: number, label: string): void {
		if (!Number.isInteger(value) || value < 0) {
			throw new Error(`${label} must be a non-negative integer`);
		}
	}

	private assertTime(value: number): void {
		if (!Number.isFinite(value)) {
			throw new TypeError('Clock time must be finite');
		}
	}
}
