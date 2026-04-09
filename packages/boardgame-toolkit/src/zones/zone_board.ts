export interface ZoneConfig {
	readonly id: string;
	readonly capacity?: number;
}

export interface ZoneBoardSnapshot<TItem> {
	readonly zones: Record<string, readonly TItem[]>;
}

export class ZoneBoard<TItem> {
	private readonly zoneConfigs = new Map<string, ZoneConfig>();
	private readonly zones = new Map<string, TItem[]>();

	constructor(configs: readonly ZoneConfig[] = []) {
		for (const config of configs) {
			this.registerZone(config);
		}
	}

	registerZone(config: ZoneConfig): this {
		if (this.zoneConfigs.has(config.id)) {
			throw new Error(`Zone already exists: ${config.id}`);
		}

		if (config.capacity !== undefined && (!Number.isInteger(config.capacity) || config.capacity < 0)) {
			throw new Error(`Invalid zone capacity for ${config.id}`);
		}

		this.zoneConfigs.set(config.id, config);
		this.zones.set(config.id, []);
		return this;
	}

	add(zoneId: string, item: TItem): this {
		const zone = this.getZone(zoneId);
		const config = this.getZoneConfig(zoneId);

		if (config.capacity !== undefined && zone.length >= config.capacity) {
			throw new Error(`Zone ${zoneId} is full`);
		}

		zone.push(item);
		return this;
	}

	removeWhere(zoneId: string, predicate: (item: TItem) => boolean, max: number = 1): TItem[] {
		if (!Number.isInteger(max) || max < 0) {
			throw new Error('max must be a non-negative integer');
		}

		const zone = this.getZone(zoneId);
		const removed: TItem[] = [];
		const kept: TItem[] = [];

		for (const item of zone) {
			if (removed.length < max && predicate(item)) {
				removed.push(item);
			} else {
				kept.push(item);
			}
		}

		this.zones.set(zoneId, kept);
		return removed;
	}

	moveWhere(sourceZoneId: string, targetZoneId: string, predicate: (item: TItem) => boolean, max: number = 1): TItem[] {
		const moved = this.removeWhere(sourceZoneId, predicate, max);
		for (const item of moved) {
			this.add(targetZoneId, item);
		}

		return moved;
	}

	list(zoneId: string): readonly TItem[] {
		return [...this.getZone(zoneId)];
	}

	count(zoneId: string): number {
		return this.getZone(zoneId).length;
	}

	find(predicate: (item: TItem) => boolean): { zoneId: string; item: TItem } | null {
		for (const [zoneId, zone] of this.zones.entries()) {
			const found = zone.find(predicate);
			if (found !== undefined) {
				return { zoneId, item: found };
			}
		}

		return null;
	}

	toSnapshot(): ZoneBoardSnapshot<TItem> {
		return {
			zones: Object.fromEntries([...this.zones.entries()].map(([zoneId, items]) => [zoneId, [...items]])),
		};
	}

	static fromSnapshot<TItem>(snapshot: ZoneBoardSnapshot<TItem>): ZoneBoard<TItem> {
		const board = new ZoneBoard<TItem>(Object.keys(snapshot.zones).map((id) => ({ id })));

		for (const [zoneId, items] of Object.entries(snapshot.zones)) {
			for (const item of items) {
				board.add(zoneId, item);
			}
		}

		return board;
	}

	private getZone(zoneId: string): TItem[] {
		const zone = this.zones.get(zoneId);
		if (!zone) {
			throw new Error(`Unknown zone: ${zoneId}`);
		}

		return zone;
	}

	private getZoneConfig(zoneId: string): ZoneConfig {
		const config = this.zoneConfigs.get(zoneId);
		if (!config) {
			throw new Error(`Unknown zone config: ${zoneId}`);
		}

		return config;
	}
}
