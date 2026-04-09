export interface ScoreEntry {
	readonly playerId: string;
	readonly score: number;
}

export interface ScoreTrackSnapshot {
	readonly scores: Record<string, number>;
}

export class ScoreTrack {
	private readonly scores = new Map<string, number>();

	constructor(initialScores: Record<string, number> = {}) {
		for (const [playerId, score] of Object.entries(initialScores)) {
			this.setScore(playerId, score);
		}
	}

	getScore(playerId: string): number {
		return this.scores.get(playerId) ?? 0;
	}

	setScore(playerId: string, score: number): this {
		if (!Number.isFinite(score)) {
			throw new TypeError(`Invalid score value for ${playerId}`);
		}

		this.scores.set(playerId, score);
		return this;
	}

	addPoints(playerId: string, delta: number): this {
		if (!Number.isFinite(delta)) {
			throw new TypeError(`Invalid score delta for ${playerId}`);
		}

		this.scores.set(playerId, this.getScore(playerId) + delta);
		return this;
	}

	leaderboard(descending: boolean = true): ScoreEntry[] {
		const entries = [...this.scores.entries()].map(([playerId, score]) => ({ playerId, score }));
		const direction = descending ? -1 : 1;
		return entries.sort((left, right) => (left.score - right.score) * direction);
	}

	getWinners(): string[] {
		if (this.scores.size === 0) {
			return [];
		}

		const maxScore = Math.max(...this.scores.values());
		return [...this.scores.entries()].filter(([, score]) => score === maxScore).map(([playerId]) => playerId);
	}

	reachedTarget(targetScore: number): string[] {
		if (!Number.isFinite(targetScore)) {
			throw new TypeError('targetScore must be finite');
		}

		return [...this.scores.entries()].filter(([, score]) => score >= targetScore).map(([playerId]) => playerId);
	}

	toSnapshot(): ScoreTrackSnapshot {
		return {
			scores: Object.fromEntries(this.scores.entries()),
		};
	}

	static fromSnapshot(snapshot: ScoreTrackSnapshot): ScoreTrack {
		return new ScoreTrack(snapshot.scores);
	}
}
