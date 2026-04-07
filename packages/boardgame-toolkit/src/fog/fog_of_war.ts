export type FogCellVisibility = 'hidden' | 'explored' | 'visible';

export type FogAudience = 'public' | 'spectator' | 'player';

export interface FogViewer<TPlayerId extends string> {
	readonly kind: FogAudience;
	readonly playerId?: TPlayerId;
}

export interface FogProjection<TCellId extends string> {
	readonly cells: Record<TCellId, FogCellVisibility>;
}

export interface FogRevealOptions {
	readonly neighborsDepth?: number;
}

export interface FogKnowledgeSnapshot<TPlayerId extends string, TCellId extends string> {
	readonly playerId: TPlayerId;
	readonly visible: readonly TCellId[];
	readonly explored: readonly TCellId[];
}

export interface FogOfWarSnapshot<TPlayerId extends string, TCellId extends string> {
	readonly playerKnowledge: readonly FogKnowledgeSnapshot<TPlayerId, TCellId>[];
	readonly publicVisible: readonly TCellId[];
	readonly publicExplored: readonly TCellId[];
}

export interface FogOfWarOptions<TCellId extends string> {
	readonly neighborsByCell?: Partial<Record<TCellId, readonly TCellId[]>>;
}

const assertDepth = (value: number): void => {
	if (!Number.isInteger(value) || value < 0) {
		throw new TypeError('neighborsDepth must be a non-negative integer');
	}
};

const getOrCreateSet = <TKey, TValue>(map: Map<TKey, Set<TValue>>, key: TKey): Set<TValue> => {
	const existing = map.get(key);
	if (existing) {
		return existing;
	}

	const created = new Set<TValue>();
	map.set(key, created);
	return created;
};

export class FogOfWar<TPlayerId extends string, TCellId extends string> {
	private readonly neighborsByCell = new Map<TCellId, readonly TCellId[]>();
	private readonly visibleByPlayer = new Map<TPlayerId, Set<TCellId>>();
	private readonly exploredByPlayer = new Map<TPlayerId, Set<TCellId>>();
	private readonly publicVisible = new Set<TCellId>();
	private readonly publicExplored = new Set<TCellId>();

	constructor(options: FogOfWarOptions<TCellId> = {}) {
		if (options.neighborsByCell) {
			for (const [cellId, neighbors] of Object.entries(options.neighborsByCell) as [TCellId, readonly TCellId[]][]) {
				this.neighborsByCell.set(cellId, [...neighbors]);
			}
		}
	}

	revealForPlayer(playerId: TPlayerId, cellIds: readonly TCellId[], options: FogRevealOptions = {}): this {
		const neighborsDepth = options.neighborsDepth ?? 0;
		assertDepth(neighborsDepth);

		const expandedCells = this.expandCells(cellIds, neighborsDepth);
		const visible = getOrCreateSet(this.visibleByPlayer, playerId);
		const explored = getOrCreateSet(this.exploredByPlayer, playerId);

		for (const cellId of expandedCells) {
			visible.add(cellId);
			explored.add(cellId);
		}

		return this;
	}

	concealForPlayer(playerId: TPlayerId, cellIds?: readonly TCellId[]): this {
		const visible = this.visibleByPlayer.get(playerId);
		if (!visible) {
			return this;
		}

		if (!cellIds) {
			visible.clear();
			return this;
		}

		for (const cellId of cellIds) {
			visible.delete(cellId);
		}

		return this;
	}

	revealPublic(cellIds: readonly TCellId[], options: FogRevealOptions = {}): this {
		const neighborsDepth = options.neighborsDepth ?? 0;
		assertDepth(neighborsDepth);

		const expandedCells = this.expandCells(cellIds, neighborsDepth);
		for (const cellId of expandedCells) {
			this.publicVisible.add(cellId);
			this.publicExplored.add(cellId);
		}

		return this;
	}

	concealPublic(cellIds?: readonly TCellId[]): this {
		if (!cellIds) {
			this.publicVisible.clear();
			return this;
		}

		for (const cellId of cellIds) {
			this.publicVisible.delete(cellId);
		}

		return this;
	}

	getCellVisibilityForPlayer(playerId: TPlayerId, cellId: TCellId): FogCellVisibility {
		const playerVisible = this.visibleByPlayer.get(playerId);
		const playerExplored = this.exploredByPlayer.get(playerId);

		if (playerVisible?.has(cellId) || this.publicVisible.has(cellId)) {
			return 'visible';
		}

		if (playerExplored?.has(cellId) || this.publicExplored.has(cellId)) {
			return 'explored';
		}

		return 'hidden';
	}

	projectForAudience(viewer: FogViewer<TPlayerId>, cells: readonly TCellId[]): FogProjection<TCellId> {
		const projection = {} as Record<TCellId, FogCellVisibility>;

		for (const cellId of cells) {
			if (viewer.kind === 'player' && viewer.playerId) {
				projection[cellId] = this.getCellVisibilityForPlayer(viewer.playerId, cellId);
				continue;
			}

			if (this.publicVisible.has(cellId)) {
				projection[cellId] = 'visible';
				continue;
			}

			if (this.publicExplored.has(cellId)) {
				projection[cellId] = 'explored';
				continue;
			}

			projection[cellId] = 'hidden';
		}

		return {
			cells: projection,
		};
	}

	toSnapshot(): FogOfWarSnapshot<TPlayerId, TCellId> {
		const playerKnowledge: FogKnowledgeSnapshot<TPlayerId, TCellId>[] = [];

		for (const [playerId, visible] of this.visibleByPlayer.entries()) {
			const explored = this.exploredByPlayer.get(playerId) ?? new Set<TCellId>();
			playerKnowledge.push({
				playerId,
				visible: [...visible],
				explored: [...explored],
			});
		}

		return {
			playerKnowledge,
			publicVisible: [...this.publicVisible],
			publicExplored: [...this.publicExplored],
		};
	}

	static fromSnapshot<TPlayerId extends string, TCellId extends string>(
		snapshot: FogOfWarSnapshot<TPlayerId, TCellId>,
		options: FogOfWarOptions<TCellId> = {}
	): FogOfWar<TPlayerId, TCellId> {
		const fog = new FogOfWar<TPlayerId, TCellId>(options);

		for (const entry of snapshot.playerKnowledge) {
			fog.visibleByPlayer.set(entry.playerId, new Set(entry.visible));
			fog.exploredByPlayer.set(entry.playerId, new Set(entry.explored));
		}

		for (const cellId of snapshot.publicVisible) {
			fog.publicVisible.add(cellId);
		}

		for (const cellId of snapshot.publicExplored) {
			fog.publicExplored.add(cellId);
		}

		return fog;
	}

	private expandCells(startCells: readonly TCellId[], neighborsDepth: number): Set<TCellId> {
		const expanded = new Set<TCellId>();
		const queue: Array<{ cellId: TCellId; depth: number }> = [];

		for (const cellId of startCells) {
			if (expanded.has(cellId)) {
				continue;
			}

			expanded.add(cellId);
			queue.push({ cellId, depth: 0 });
		}

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) {
				continue;
			}

			if (current.depth >= neighborsDepth) {
				continue;
			}

			const neighbors = this.neighborsByCell.get(current.cellId) ?? [];
			for (const neighbor of neighbors) {
				if (expanded.has(neighbor)) {
					continue;
				}

				expanded.add(neighbor);
				queue.push({
					cellId: neighbor,
					depth: current.depth + 1,
				});
			}
		}

		return expanded;
	}
}
