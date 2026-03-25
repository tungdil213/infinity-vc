import { describe, expect, test } from 'vitest';
import { ResourceBank } from './resource_bank.js';

describe('ResourceBank', () => {
	test('grants and spends resources', () => {
		const bank = new ResourceBank();

		bank.grant('p1', 'gold', 5);
		bank.spend('p1', { gold: 3 });

		expect(bank.getBalance('p1', 'gold')).toBe(2);
	});

	test('transfers resources between players', () => {
		const bank = new ResourceBank({ p1: { gold: 4 }, p2: { gold: 1 } });

		bank.transfer('p1', 'p2', { gold: 2 });

		expect(bank.getBalance('p1', 'gold')).toBe(2);
		expect(bank.getBalance('p2', 'gold')).toBe(3);
	});
});
