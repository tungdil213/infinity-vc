export interface GridPosition {
	readonly x: number;
	readonly y: number;
}

export type Neighborhood = 'orthogonal' | 'diagonal' | 'all';

export interface GridBoardEntry<TCell> {
	readonly position: GridPosition;
	readonly value: TCell;
}

export interface GridBoardSnapshot<TCell> {
	readonly width: number;
	readonly height: number;
	readonly cells: readonly GridBoardEntry<TCell>[];
}

const ORTHOGONAL_OFFSETS: readonly GridPosition[] = [
	{ x: 0, y: -1 },
	{ x: 1, y: 0 },
	{ x: 0, y: 1 },
	{ x: -1, y: 0 },
];

const DIAGONAL_OFFSETS: readonly GridPosition[] = [
	{ x: -1, y: -1 },
	{ x: 1, y: -1 },
	{ x: 1, y: 1 },
	{ x: -1, y: 1 },
];

export class GridBoard<TCell> {
	private readonly cells = new Map<string, TCell>();

	constructor(
		readonly width: number,
		readonly height: number
	) {
		if (!Number.isInteger(width) || width < 1) {
			throw new Error('Grid width must be a positive integer');
		}

		if (!Number.isInteger(height) || height < 1) {
			throw new Error('Grid height must be a positive integer');
		}
	}

	inBounds(position: GridPosition): boolean {
		return (
			Number.isInteger(position.x) &&
			Number.isInteger(position.y) &&
			position.x >= 0 &&
			position.x < this.width &&
			position.y >= 0 &&
			position.y < this.height
		);
	}

	has(position: GridPosition): boolean {
		return this.cells.has(this.toKey(position));
	}

	get(position: GridPosition): TCell | undefined {
		return this.cells.get(this.toKey(position));
	}

	set(position: GridPosition, value: TCell): this {
		this.assertInBounds(position);
		this.cells.set(this.toKey(position), value);
		return this;
	}

	remove(position: GridPosition): TCell | undefined {
		const key = this.toKey(position);
		const previous = this.cells.get(key);
		this.cells.delete(key);
		return previous;
	}

	move(from: GridPosition, to: GridPosition, options: { overwrite?: boolean } = {}): this {
		this.assertInBounds(from);
		this.assertInBounds(to);

		const originKey = this.toKey(from);
		if (!this.cells.has(originKey)) {
			throw new Error(`No cell at (${from.x}, ${from.y})`);
		}

		const destinationKey = this.toKey(to);
		if (!options.overwrite && this.cells.has(destinationKey)) {
			throw new Error(`Destination (${to.x}, ${to.y}) is occupied`);
		}

		const value = this.cells.get(originKey) as TCell;
		this.cells.set(destinationKey, value);
		this.cells.delete(originKey);
		return this;
	}

	neighbors(position: GridPosition, neighborhood: Neighborhood = 'orthogonal'): GridPosition[] {
		this.assertInBounds(position);

		const offsets =
			neighborhood === 'orthogonal'
				? ORTHOGONAL_OFFSETS
				: neighborhood === 'diagonal'
					? DIAGONAL_OFFSETS
					: [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS];

		const results: GridPosition[] = [];
		for (const offset of offsets) {
			const candidate = {
				x: position.x + offset.x,
				y: position.y + offset.y,
			};

			if (this.inBounds(candidate)) {
				results.push(candidate);
			}
		}

		return results;
	}

	entries(): GridBoardEntry<TCell>[] {
		return [...this.cells.entries()].map(([key, value]) => {
			const [x, y] = key.split(':').map((part) => Number.parseInt(part, 10));
			return {
				position: { x, y },
				value,
			};
		});
	}

	clear(): this {
		this.cells.clear();
		return this;
	}

	toSnapshot(): GridBoardSnapshot<TCell> {
		return {
			width: this.width,
			height: this.height,
			cells: this.entries(),
		};
	}

	static fromSnapshot<TCell>(snapshot: GridBoardSnapshot<TCell>): GridBoard<TCell> {
		const board = new GridBoard<TCell>(snapshot.width, snapshot.height);
		for (const entry of snapshot.cells) {
			board.set(entry.position, entry.value);
		}
		return board;
	}

	private assertInBounds(position: GridPosition): void {
		if (!this.inBounds(position)) {
			throw new Error(`Position (${position.x}, ${position.y}) is out of bounds`);
		}
	}

	private toKey(position: GridPosition): string {
		return `${position.x}:${position.y}`;
	}
}
