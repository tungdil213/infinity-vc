export interface ObjectiveDefinition<TObjectiveId extends string> {
	readonly id: TObjectiveId;
	readonly name: string;
	readonly points: number;
	readonly maxClaims?: number;
	readonly maxClaimsPerPlayer?: number;
}

export interface ObjectiveClaim<TPlayerId extends string> {
	readonly playerId: TPlayerId;
	readonly atMs: number;
}

export interface ObjectiveTrackSnapshot<TObjectiveId extends string, TPlayerId extends string> {
	readonly objectives: Record<TObjectiveId, ObjectiveDefinition<TObjectiveId>>;
	readonly claims: Record<TObjectiveId, readonly ObjectiveClaim<TPlayerId>[]>;
}

export class ObjectiveTrack<TObjectiveId extends string, TPlayerId extends string> {
	private readonly objectives = new Map<TObjectiveId, ObjectiveDefinition<TObjectiveId>>();
	private readonly claims = new Map<TObjectiveId, ObjectiveClaim<TPlayerId>[]>();

	register(definition: ObjectiveDefinition<TObjectiveId>): this {
		if (this.objectives.has(definition.id)) {
			throw new Error(`Objective ${definition.id} already registered`);
		}

		this.assertObjectiveDefinition(definition);
		this.objectives.set(definition.id, definition);
		this.claims.set(definition.id, []);
		return this;
	}

	hasObjective(objectiveId: TObjectiveId): boolean {
		return this.objectives.has(objectiveId);
	}

	listObjectives(): readonly ObjectiveDefinition<TObjectiveId>[] {
		return [...this.objectives.values()];
	}

	canClaim(objectiveId: TObjectiveId, playerId: TPlayerId): boolean {
		const objective = this.getObjective(objectiveId);
		const claims = this.getClaims(objectiveId);

		const maxClaims = objective.maxClaims ?? 1;
		if (claims.length >= maxClaims) {
			return false;
		}

		const playerClaims = claims.filter((claim) => claim.playerId === playerId);
		const maxClaimsPerPlayer = objective.maxClaimsPerPlayer ?? 1;

		return playerClaims.length < maxClaimsPerPlayer;
	}

	claim(objectiveId: TObjectiveId, playerId: TPlayerId, atMs: number = Date.now()): this {
		if (!this.canClaim(objectiveId, playerId)) {
			throw new Error(`Player ${playerId} cannot claim objective ${objectiveId}`);
		}

		const claims = this.getClaims(objectiveId);
		claims.push({ playerId, atMs });
		return this;
	}

	claimsForObjective(objectiveId: TObjectiveId): readonly ObjectiveClaim<TPlayerId>[] {
		return [...this.getClaims(objectiveId)];
	}

	scoreForPlayer(playerId: TPlayerId): number {
		let total = 0;

		for (const [objectiveId, claims] of this.claims.entries()) {
			const objective = this.objectives.get(objectiveId) as ObjectiveDefinition<TObjectiveId>;
			const playerClaimCount = claims.filter((claim) => claim.playerId === playerId).length;
			total += objective.points * playerClaimCount;
		}

		return total;
	}

	leaderboard(playerIds: readonly TPlayerId[]): readonly { playerId: TPlayerId; score: number }[] {
		return [...playerIds]
			.map((playerId) => ({ playerId, score: this.scoreForPlayer(playerId) }))
			.sort((left, right) => right.score - left.score);
	}

	toSnapshot(): ObjectiveTrackSnapshot<TObjectiveId, TPlayerId> {
		const objectives = {} as Record<TObjectiveId, ObjectiveDefinition<TObjectiveId>>;
		for (const [objectiveId, definition] of this.objectives.entries()) {
			objectives[objectiveId] = definition;
		}

		const claims = {} as Record<TObjectiveId, readonly ObjectiveClaim<TPlayerId>[]>;
		for (const [objectiveId, objectiveClaims] of this.claims.entries()) {
			claims[objectiveId] = [...objectiveClaims];
		}

		return {
			objectives,
			claims,
		};
	}

	static fromSnapshot<TObjectiveId extends string, TPlayerId extends string>(
		snapshot: ObjectiveTrackSnapshot<TObjectiveId, TPlayerId>
	): ObjectiveTrack<TObjectiveId, TPlayerId> {
		const track = new ObjectiveTrack<TObjectiveId, TPlayerId>();

		for (const [, definition] of Object.entries(snapshot.objectives) as [
			TObjectiveId,
			ObjectiveDefinition<TObjectiveId>,
		][]) {
			track.register(definition);
		}

		for (const [objectiveId, objectiveClaims] of Object.entries(snapshot.claims) as [
			TObjectiveId,
			readonly ObjectiveClaim<TPlayerId>[],
		][]) {
			const claims = track.claims.get(objectiveId) as ObjectiveClaim<TPlayerId>[];
			claims.push(...objectiveClaims);
		}

		return track;
	}

	private getObjective(objectiveId: TObjectiveId): ObjectiveDefinition<TObjectiveId> {
		const objective = this.objectives.get(objectiveId);
		if (!objective) {
			throw new Error(`Unknown objective: ${objectiveId}`);
		}

		return objective;
	}

	private getClaims(objectiveId: TObjectiveId): ObjectiveClaim<TPlayerId>[] {
		this.getObjective(objectiveId);
		return this.claims.get(objectiveId) as ObjectiveClaim<TPlayerId>[];
	}

	private assertObjectiveDefinition(definition: ObjectiveDefinition<TObjectiveId>): void {
		if (!Number.isFinite(definition.points)) {
			throw new TypeError(`Objective ${definition.id} points must be finite`);
		}

		if (definition.maxClaims !== undefined && (!Number.isInteger(definition.maxClaims) || definition.maxClaims < 1)) {
			throw new Error(`Objective ${definition.id} maxClaims must be a positive integer`);
		}

		if (
			definition.maxClaimsPerPlayer !== undefined &&
			(!Number.isInteger(definition.maxClaimsPerPlayer) || definition.maxClaimsPerPlayer < 1)
		) {
			throw new Error(`Objective ${definition.id} maxClaimsPerPlayer must be a positive integer`);
		}
	}
}
