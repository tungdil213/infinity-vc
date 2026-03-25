export interface RouteEdge<TNodeId extends string, TEdgeId extends string> {
	readonly id: TEdgeId;
	readonly from: TNodeId;
	readonly to: TNodeId;
}

export interface RouteNetworkSnapshot<TNodeId extends string, TEdgeId extends string, TPlayerId extends string> {
	readonly nodes: readonly TNodeId[];
	readonly edges: Record<TEdgeId, { from: TNodeId; to: TNodeId }>;
	readonly claimedEdges: Partial<Record<TEdgeId, TPlayerId>>;
	readonly claimedNodes: Partial<Record<TNodeId, TPlayerId>>;
}

export interface ClaimEdgeOptions {
	readonly requireConnection?: boolean;
}

export interface ClaimNodeOptions {
	readonly requireAdjacentOwnedEdge?: boolean;
	readonly minDistanceFromAnyClaimedNode?: number;
}

export class RouteNetwork<TNodeId extends string, TEdgeId extends string, TPlayerId extends string> {
	private readonly nodes = new Set<TNodeId>();
	private readonly edges = new Map<TEdgeId, RouteEdge<TNodeId, TEdgeId>>();
	private readonly claimedEdges = new Map<TEdgeId, TPlayerId>();
	private readonly claimedNodes = new Map<TNodeId, TPlayerId>();
	private readonly incidentEdges = new Map<TNodeId, Set<TEdgeId>>();

	addNode(nodeId: TNodeId): this {
		if (this.nodes.has(nodeId)) {
			throw new Error(`Node already exists: ${nodeId}`);
		}

		this.nodes.add(nodeId);
		this.incidentEdges.set(nodeId, new Set());
		return this;
	}

	addEdge(edgeId: TEdgeId, from: TNodeId, to: TNodeId): this {
		if (this.edges.has(edgeId)) {
			throw new Error(`Edge already exists: ${edgeId}`);
		}

		if (from === to) {
			throw new TypeError('Route edges must connect two different nodes');
		}

		this.assertNodeExists(from);
		this.assertNodeExists(to);

		this.edges.set(edgeId, {
			id: edgeId,
			from,
			to,
		});

		(this.incidentEdges.get(from) as Set<TEdgeId>).add(edgeId);
		(this.incidentEdges.get(to) as Set<TEdgeId>).add(edgeId);

		return this;
	}

	listNodes(): readonly TNodeId[] {
		return [...this.nodes];
	}

	listEdges(): readonly RouteEdge<TNodeId, TEdgeId>[] {
		return [...this.edges.values()];
	}

	neighbors(nodeId: TNodeId): readonly TNodeId[] {
		this.assertNodeExists(nodeId);

		const neighbors = new Set<TNodeId>();
		for (const edgeId of this.incident(nodeId)) {
			const edge = this.edges.get(edgeId) as RouteEdge<TNodeId, TEdgeId>;
			neighbors.add(edge.from === nodeId ? edge.to : edge.from);
		}

		return [...neighbors];
	}

	nodeOwner(nodeId: TNodeId): TPlayerId | undefined {
		this.assertNodeExists(nodeId);
		return this.claimedNodes.get(nodeId);
	}

	edgeOwner(edgeId: TEdgeId): TPlayerId | undefined {
		this.assertEdgeExists(edgeId);
		return this.claimedEdges.get(edgeId);
	}

	claimEdge(edgeId: TEdgeId, playerId: TPlayerId, options: ClaimEdgeOptions = {}): this {
		this.assertEdgeExists(edgeId);

		if (this.claimedEdges.has(edgeId)) {
			throw new Error(`Edge ${edgeId} is already claimed`);
		}

		if (options.requireConnection && this.playerHasInfrastructure(playerId)) {
			const edge = this.edges.get(edgeId) as RouteEdge<TNodeId, TEdgeId>;
			if (!this.isConnectedToPlayerInfrastructure(edge, playerId)) {
				throw new Error(`Edge ${edgeId} is not connected to player ${playerId} infrastructure`);
			}
		}

		this.claimedEdges.set(edgeId, playerId);
		return this;
	}

	claimNode(nodeId: TNodeId, playerId: TPlayerId, options: ClaimNodeOptions = {}): this {
		this.assertNodeExists(nodeId);

		if (this.claimedNodes.has(nodeId)) {
			throw new Error(`Node ${nodeId} is already claimed`);
		}

		if (options.requireAdjacentOwnedEdge) {
			const hasAdjacentOwnedEdge = [...this.incident(nodeId)].some(
				(edgeId) => this.claimedEdges.get(edgeId) === playerId
			);

			if (!hasAdjacentOwnedEdge) {
				throw new Error(`Node ${nodeId} is not adjacent to an owned edge for player ${playerId}`);
			}
		}

		if (options.minDistanceFromAnyClaimedNode !== undefined) {
			const minDistance = options.minDistanceFromAnyClaimedNode;
			if (!Number.isInteger(minDistance) || minDistance < 0) {
				throw new TypeError('minDistanceFromAnyClaimedNode must be a non-negative integer');
			}

			const nearestDistance = this.distanceToNearestClaimedNode(nodeId);
			if (nearestDistance !== null && nearestDistance <= minDistance) {
				throw new Error(`Node ${nodeId} is too close to another claimed node`);
			}
		}

		this.claimedNodes.set(nodeId, playerId);
		return this;
	}

	connectedEdges(playerId: TPlayerId): readonly TEdgeId[] {
		return [...this.claimedEdges.entries()].filter(([, ownerId]) => ownerId === playerId).map(([edgeId]) => edgeId);
	}

	longestRouteLength(playerId: TPlayerId): number {
		const ownedEdgeIds = this.connectedEdges(playerId);
		if (ownedEdgeIds.length === 0) {
			return 0;
		}

		const ownedEdgeSet = new Set(ownedEdgeIds);
		const ownedNodes = new Set<TNodeId>();

		for (const edgeId of ownedEdgeIds) {
			const edge = this.edges.get(edgeId) as RouteEdge<TNodeId, TEdgeId>;
			ownedNodes.add(edge.from);
			ownedNodes.add(edge.to);
		}

		const visited = new Set<TEdgeId>();
		let longest = 0;

		const dfs = (nodeId: TNodeId): number => {
			let best = 0;

			for (const edgeId of this.incident(nodeId)) {
				if (!ownedEdgeSet.has(edgeId) || visited.has(edgeId)) {
					continue;
				}

				visited.add(edgeId);
				const edge = this.edges.get(edgeId) as RouteEdge<TNodeId, TEdgeId>;
				const nextNode = edge.from === nodeId ? edge.to : edge.from;
				best = Math.max(best, 1 + dfs(nextNode));
				visited.delete(edgeId);
			}

			return best;
		};

		for (const nodeId of ownedNodes) {
			longest = Math.max(longest, dfs(nodeId));
		}

		return longest;
	}

	toSnapshot(): RouteNetworkSnapshot<TNodeId, TEdgeId, TPlayerId> {
		const edges = {} as Record<TEdgeId, { from: TNodeId; to: TNodeId }>;
		for (const [edgeId, edge] of this.edges.entries()) {
			edges[edgeId] = {
				from: edge.from,
				to: edge.to,
			};
		}

		return {
			nodes: [...this.nodes],
			edges,
			claimedEdges: Object.fromEntries(this.claimedEdges.entries()) as Partial<Record<TEdgeId, TPlayerId>>,
			claimedNodes: Object.fromEntries(this.claimedNodes.entries()) as Partial<Record<TNodeId, TPlayerId>>,
		};
	}

	static fromSnapshot<TNodeId extends string, TEdgeId extends string, TPlayerId extends string>(
		snapshot: RouteNetworkSnapshot<TNodeId, TEdgeId, TPlayerId>
	): RouteNetwork<TNodeId, TEdgeId, TPlayerId> {
		const network = new RouteNetwork<TNodeId, TEdgeId, TPlayerId>();

		for (const nodeId of snapshot.nodes) {
			network.addNode(nodeId);
		}

		for (const [edgeId, edge] of Object.entries(snapshot.edges) as [TEdgeId, { from: TNodeId; to: TNodeId }][]) {
			network.addEdge(edgeId, edge.from, edge.to);
		}

		for (const [edgeId, playerId] of Object.entries(snapshot.claimedEdges) as [TEdgeId, TPlayerId][]) {
			network.claimedEdges.set(edgeId, playerId);
		}

		for (const [nodeId, playerId] of Object.entries(snapshot.claimedNodes) as [TNodeId, TPlayerId][]) {
			network.claimedNodes.set(nodeId, playerId);
		}

		return network;
	}

	private distanceToNearestClaimedNode(fromNode: TNodeId): number | null {
		if (this.claimedNodes.size === 0) {
			return null;
		}

		const visited = new Set<TNodeId>([fromNode]);
		const queue: { nodeId: TNodeId; distance: number }[] = [{ nodeId: fromNode, distance: 0 }];

		while (queue.length > 0) {
			const current = queue.shift() as { nodeId: TNodeId; distance: number };

			if (current.distance > 0 && this.claimedNodes.has(current.nodeId)) {
				return current.distance;
			}

			for (const neighborId of this.neighbors(current.nodeId)) {
				if (visited.has(neighborId)) {
					continue;
				}

				visited.add(neighborId);
				queue.push({
					nodeId: neighborId,
					distance: current.distance + 1,
				});
			}
		}

		return null;
	}

	private playerHasInfrastructure(playerId: TPlayerId): boolean {
		for (const owner of this.claimedEdges.values()) {
			if (owner === playerId) {
				return true;
			}
		}

		for (const owner of this.claimedNodes.values()) {
			if (owner === playerId) {
				return true;
			}
		}

		return false;
	}

	private isConnectedToPlayerInfrastructure(edge: RouteEdge<TNodeId, TEdgeId>, playerId: TPlayerId): boolean {
		if (this.claimedNodes.get(edge.from) === playerId || this.claimedNodes.get(edge.to) === playerId) {
			return true;
		}

		for (const ownedEdgeId of this.connectedEdges(playerId)) {
			const ownedEdge = this.edges.get(ownedEdgeId) as RouteEdge<TNodeId, TEdgeId>;
			if (
				ownedEdge.from === edge.from ||
				ownedEdge.from === edge.to ||
				ownedEdge.to === edge.from ||
				ownedEdge.to === edge.to
			) {
				return true;
			}
		}

		return false;
	}

	private incident(nodeId: TNodeId): Set<TEdgeId> {
		return this.incidentEdges.get(nodeId) as Set<TEdgeId>;
	}

	private assertNodeExists(nodeId: TNodeId): void {
		if (!this.nodes.has(nodeId)) {
			throw new Error(`Unknown node: ${nodeId}`);
		}
	}

	private assertEdgeExists(edgeId: TEdgeId): void {
		if (!this.edges.has(edgeId)) {
			throw new Error(`Unknown edge: ${edgeId}`);
		}
	}
}
