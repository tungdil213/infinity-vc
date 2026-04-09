export type ResourceMap = Record<string, number>;

export interface ResourceBankSnapshot {
	readonly balances: Record<string, ResourceMap>;
}

export class ResourceBank {
	private readonly balances = new Map<string, Map<string, number>>();

	constructor(initial: Record<string, ResourceMap> = {}) {
		for (const [playerId, resources] of Object.entries(initial)) {
			for (const [resourceId, amount] of Object.entries(resources)) {
				this.grant(playerId, resourceId, amount);
			}
		}
	}

	getBalance(playerId: string, resourceId: string): number {
		return this.getPlayerBalance(playerId).get(resourceId) ?? 0;
	}

	getPlayerResources(playerId: string): ResourceMap {
		return Object.fromEntries(this.getPlayerBalance(playerId).entries());
	}

	grant(playerId: string, resourceId: string, amount: number): this {
		this.assertValidAmount(amount, 'grant');

		const playerBalance = this.getPlayerBalance(playerId);
		playerBalance.set(resourceId, (playerBalance.get(resourceId) ?? 0) + amount);
		return this;
	}

	canAfford(playerId: string, cost: ResourceMap): boolean {
		return Object.entries(cost).every(([resourceId, amount]) => this.getBalance(playerId, resourceId) >= amount);
	}

	spend(playerId: string, cost: ResourceMap): this {
		if (!this.canAfford(playerId, cost)) {
			throw new Error(`Player ${playerId} cannot afford requested cost`);
		}

		const playerBalance = this.getPlayerBalance(playerId);
		for (const [resourceId, amount] of Object.entries(cost)) {
			this.assertValidAmount(amount, 'spend');
			playerBalance.set(resourceId, (playerBalance.get(resourceId) ?? 0) - amount);
		}

		return this;
	}

	transfer(fromPlayerId: string, toPlayerId: string, resources: ResourceMap): this {
		this.spend(fromPlayerId, resources);

		for (const [resourceId, amount] of Object.entries(resources)) {
			this.grant(toPlayerId, resourceId, amount);
		}

		return this;
	}

	toSnapshot(): ResourceBankSnapshot {
		return {
			balances: Object.fromEntries(
				[...this.balances.entries()].map(([playerId, resources]) => [playerId, Object.fromEntries(resources.entries())])
			),
		};
	}

	static fromSnapshot(snapshot: ResourceBankSnapshot): ResourceBank {
		return new ResourceBank(snapshot.balances);
	}

	private getPlayerBalance(playerId: string): Map<string, number> {
		if (!this.balances.has(playerId)) {
			this.balances.set(playerId, new Map());
		}

		return this.balances.get(playerId) as Map<string, number>;
	}

	private assertValidAmount(amount: number, operation: string): void {
		if (!Number.isFinite(amount) || amount < 0) {
			throw new Error(`Invalid ${operation} amount: ${amount}`);
		}
	}
}
