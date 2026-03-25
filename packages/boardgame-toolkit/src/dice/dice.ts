import { systemRandom } from '../random/prng.js';
import type { RandomSource } from '../random/prng.js';

export type DiceFace = number | string;

export interface DiceDefinition<TFace extends DiceFace = number> {
	readonly faces: readonly TFace[];
	readonly label?: string;
}

export interface DiceRoll<TFace extends DiceFace = number> {
	readonly face: TFace;
	readonly index: number;
}

export interface DiceNotation {
	readonly count: number;
	readonly sides: number;
	readonly modifier: number;
}

export interface DiceNotationRollResult {
	readonly notation: string;
	readonly parsed: DiceNotation;
	readonly rolls: readonly number[];
	readonly subtotal: number;
	readonly modifier: number;
	readonly total: number;
}

export const createNumericDie = (sides: number, label?: string): DiceDefinition<number> => {
	if (!Number.isInteger(sides) || sides < 2) {
		throw new Error('A die must have at least 2 sides');
	}

	return {
		label,
		faces: Array.from({ length: sides }, (_, index) => index + 1),
	};
};

export const rollDie = <TFace extends DiceFace>(
	die: DiceDefinition<TFace>,
	rng: RandomSource = systemRandom
): DiceRoll<TFace> => {
	if (die.faces.length === 0) {
		throw new Error('Cannot roll a die without faces');
	}

	const index = rng.int(0, die.faces.length - 1);
	return {
		face: die.faces[index],
		index,
	};
};

export const rollDice = <TFace extends DiceFace>(
	die: DiceDefinition<TFace>,
	count: number,
	rng: RandomSource = systemRandom
): DiceRoll<TFace>[] => {
	if (!Number.isInteger(count) || count < 1) {
		throw new Error('Dice count must be a positive integer');
	}

	return Array.from({ length: count }, () => rollDie(die, rng));
};

export const parseDiceNotation = (notation: string): DiceNotation => {
	const normalized = notation.trim().toLowerCase();
	const matched = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
	if (!matched) {
		throw new Error(`Invalid dice notation: ${notation}`);
	}

	const [, rawCount, rawSides, rawModifier] = matched;
	const count = rawCount ? Number.parseInt(rawCount, 10) : 1;
	const sides = Number.parseInt(rawSides, 10);
	const modifier = rawModifier ? Number.parseInt(rawModifier, 10) : 0;

	if (!Number.isInteger(count) || count < 1) {
		throw new Error('Dice count must be >= 1');
	}

	if (!Number.isInteger(sides) || sides < 2) {
		throw new Error('Dice sides must be >= 2');
	}

	if (!Number.isInteger(modifier)) {
		throw new TypeError('Dice modifier must be an integer');
	}

	return { count, sides, modifier };
};

export const rollNotation = (notation: string, rng: RandomSource = systemRandom): DiceNotationRollResult => {
	const parsed = parseDiceNotation(notation);
	const die = createNumericDie(parsed.sides);
	const rolls = rollDice(die, parsed.count, rng).map((roll) => roll.face);
	const subtotal = rolls.reduce((sum, current) => sum + current, 0);

	return {
		notation,
		parsed,
		rolls,
		subtotal,
		modifier: parsed.modifier,
		total: subtotal + parsed.modifier,
	};
};
