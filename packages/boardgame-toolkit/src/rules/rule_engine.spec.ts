import { describe, expect, it } from 'vitest';
import { RuleEngine } from './rule_engine.js';

type Command = { type: 'add'; amount: number } | { type: 'sub'; amount: number };

describe('RuleEngine', () => {
	it('rejects commands that violate blocking rules', () => {
		const engine = new RuleEngine<number, Command>(
			(state, command) => {
				return command.type === 'add' ? state + command.amount : state - command.amount;
			},
			[
				({ command }) => {
					if (command.amount < 0) {
						return {
							code: 'amount-negative',
							message: 'Amount cannot be negative',
						};
					}

					return null;
				},
				({ state, command }) => {
					if (command.type === 'sub' && command.amount > state) {
						return {
							code: 'insufficient-balance',
							message: 'Cannot go below zero',
						};
					}

					return null;
				},
			]
		);

		const rejected = engine.apply(3, { type: 'sub', amount: 5 });
		expect(rejected.accepted).toBe(false);
		expect(rejected.state).toBe(3);
		expect(rejected.violations.map((violation) => violation.code)).toEqual(['insufficient-balance']);
	});

	it('accepts command and applies reducer when valid', () => {
		const engine = new RuleEngine<number, Command>((state, command) => {
			return command.type === 'add' ? state + command.amount : state - command.amount;
		});

		const result = engine.apply(3, { type: 'add', amount: 2 });

		expect(result.accepted).toBe(true);
		expect(result.state).toBe(5);
		expect(result.violations).toEqual([]);
	});

	it('can block warnings if requested', () => {
		const engine = new RuleEngine<number, Command>(
			(state) => state,
			[
				() => ({
					code: 'soft-warning',
					message: 'Non-blocking by default',
					severity: 'warning',
				}),
			]
		);

		const acceptedByDefault = engine.apply(0, { type: 'add', amount: 1 });
		expect(acceptedByDefault.accepted).toBe(true);

		const blockedWarning = engine.apply(0, { type: 'add', amount: 1 }, { allowWarnings: false });
		expect(blockedWarning.accepted).toBe(false);
		expect(blockedWarning.violations).toHaveLength(1);
	});
});
