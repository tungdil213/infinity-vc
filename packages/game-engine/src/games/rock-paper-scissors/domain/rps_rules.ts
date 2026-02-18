import { RpsMoves, type RpsMove } from './rps_types.js';

const winnersByMove: Record<RpsMove, RpsMove> = {
	[RpsMoves.ROCK]: RpsMoves.SCISSORS,
	[RpsMoves.PAPER]: RpsMoves.ROCK,
	[RpsMoves.SCISSORS]: RpsMoves.PAPER,
};

export function isRpsMove(value: string): value is RpsMove {
	return Object.values(RpsMoves).includes(value as RpsMove);
}

export function resolveRoundWinner(firstMove: RpsMove, secondMove: RpsMove): 0 | 1 | null {
	if (firstMove === secondMove) {
		return null;
	}

	return winnersByMove[firstMove] === secondMove ? 0 : 1;
}
