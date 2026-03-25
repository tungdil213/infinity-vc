export type TurnDirection = 'clockwise' | 'counterclockwise';

export interface TurnSnapshot {
	readonly players: readonly string[];
	readonly currentPlayer: string | null;
	readonly currentIndex: number;
	readonly round: number;
	readonly direction: TurnDirection;
	readonly skippedOnce: readonly string[];
}

export class TurnManager {
	private players: string[];
	private currentIndex: number;
	private round = 1;
	private direction: TurnDirection = 'clockwise';
	private skippedOnce = new Set<string>();

	constructor(players: readonly string[], initialCurrentIndex: number = 0) {
		if (players.length === 0) {
			throw new Error('TurnManager requires at least one player');
		}

		this.players = [...players];
		this.currentIndex = Math.max(0, Math.min(initialCurrentIndex, players.length - 1));
	}

	getCurrentPlayer(): string {
		return this.players[this.currentIndex];
	}

	getPlayers(): readonly string[] {
		return [...this.players];
	}

	getRound(): number {
		return this.round;
	}

	getDirection(): TurnDirection {
		return this.direction;
	}

	nextTurn(): string {
		if (this.players.length === 0) {
			throw new Error('Cannot advance turns without players');
		}

		let wrapped = false;

		while (true) {
			const movement = this.advanceIndex(this.currentIndex);
			this.currentIndex = movement.index;
			wrapped = wrapped || movement.wrapped;

			const candidate = this.players[this.currentIndex];
			if (this.skippedOnce.has(candidate)) {
				this.skippedOnce.delete(candidate);
				continue;
			}

			if (wrapped) {
				this.round += 1;
			}

			return candidate;
		}
	}

	reverseDirection(): this {
		this.direction = this.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
		return this;
	}

	skipPlayerOnce(playerId: string): this {
		this.ensurePlayerExists(playerId);
		this.skippedOnce.add(playerId);
		return this;
	}

	addPlayer(playerId: string, position: number = this.players.length): this {
		if (this.players.includes(playerId)) {
			throw new Error(`Player ${playerId} already exists in turn order`);
		}

		const insertAt = Math.max(0, Math.min(position, this.players.length));
		this.players.splice(insertAt, 0, playerId);

		if (insertAt <= this.currentIndex) {
			this.currentIndex += 1;
		}

		return this;
	}

	removePlayer(playerId: string): boolean {
		const index = this.players.indexOf(playerId);
		if (index === -1) {
			return false;
		}

		this.players.splice(index, 1);
		this.skippedOnce.delete(playerId);

		if (this.players.length === 0) {
			this.currentIndex = 0;
			return true;
		}

		if (index < this.currentIndex) {
			this.currentIndex -= 1;
		} else if (index === this.currentIndex && this.currentIndex >= this.players.length) {
			this.currentIndex = 0;
		}

		return true;
	}

	toSnapshot(): TurnSnapshot {
		return {
			players: [...this.players],
			currentPlayer: this.players[this.currentIndex] ?? null,
			currentIndex: this.currentIndex,
			round: this.round,
			direction: this.direction,
			skippedOnce: [...this.skippedOnce],
		};
	}

	private ensurePlayerExists(playerId: string): void {
		if (!this.players.includes(playerId)) {
			throw new Error(`Unknown player in turn order: ${playerId}`);
		}
	}

	private advanceIndex(currentIndex: number): { index: number; wrapped: boolean } {
		const lastIndex = this.players.length - 1;

		if (this.direction === 'clockwise') {
			const wrapped = currentIndex >= lastIndex;
			return { index: wrapped ? 0 : currentIndex + 1, wrapped };
		}

		const wrapped = currentIndex <= 0;
		return { index: wrapped ? lastIndex : currentIndex - 1, wrapped };
	}
}
