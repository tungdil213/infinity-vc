import { describe, expect, it } from 'vitest';
import { ResourceBank } from '../resources/resource_bank.js';
import { TradeBroker } from './trade_broker.js';

describe('TradeBroker', () => {
	it('accepts player-to-player offer and transfers resources', () => {
		const bank = new ResourceBank({
			p1: { wood: 4, ore: 0 },
			p2: { wood: 0, ore: 3 },
		});

		const broker = new TradeBroker<'p1' | 'p2', 'wood' | 'ore'>();
		const offer = broker.openOffer('p1', ['p2'], { wood: 2 }, { ore: 1 }, 100);
		const accepted = broker.acceptOffer(offer.id, 'p2', bank);

		expect(accepted.status).toBe('accepted');
		expect(accepted.acceptedBy).toBe('p2');
		expect(bank.getPlayerResources('p1')).toEqual({ wood: 2, ore: 1 });
		expect(bank.getPlayerResources('p2')).toEqual({ wood: 2, ore: 2 });
	});

	it('supports bank trade rates (4:1 default, resource override)', () => {
		const bank = new ResourceBank({
			p1: { wood: 4, brick: 2, ore: 0, wheat: 0 },
		});
		const broker = new TradeBroker<'p1', 'wood' | 'brick' | 'ore' | 'wheat'>();

		broker.bankTrade('p1', { wood: 4 }, { ore: 1 }, bank);
		expect(bank.getPlayerResources('p1')).toEqual({ wood: 0, brick: 2, ore: 1, wheat: 0 });

		broker.bankTrade('p1', { brick: 2 }, { wheat: 1 }, bank, { rateByGivenResource: { brick: 2 }, defaultRate: 4 });
		expect(bank.getPlayerResources('p1')).toEqual({ wood: 0, brick: 0, ore: 1, wheat: 1 });
	});

	it('allows offer cancellation by owner only', () => {
		const broker = new TradeBroker<'p1' | 'p2', 'wood'>();
		const offer = broker.openOffer('p1', 'all', { wood: 1 }, { wood: 1 });

		expect(() => broker.cancelOffer(offer.id, 'p2')).toThrow('cannot cancel');

		const cancelled = broker.cancelOffer(offer.id, 'p1');
		expect(cancelled.status).toBe('cancelled');
	});
});
