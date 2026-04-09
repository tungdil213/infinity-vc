import { describe, expect, it } from 'vitest';
import { PrivacyChannel } from './privacy_channel.js';

describe('PrivacyChannel', () => {
	it('projects state into public and per-player views', () => {
		const channel = new PrivacyChannel(['p1', 'p2'] as const);

		const projections = channel.projectState(
			{
				secretByPlayer: {
					p1: 11,
					p2: 42,
				},
				shared: 'round-2',
			},
			{
				projectPublic: (state) => ({ shared: state.shared }),
				projectForPlayer: (state, playerId) => ({
					shared: state.shared,
					secret: state.secretByPlayer[playerId],
				}),
			}
		);

		expect(projections.publicState).toEqual({ shared: 'round-2' });
		expect(projections.byPlayer).toEqual({
			p1: { shared: 'round-2', secret: 11 },
			p2: { shared: 'round-2', secret: 42 },
		});
	});

	it('creates notification bundles with private overrides', () => {
		const channel = new PrivacyChannel(['p1', 'p2', 'p3'] as const);
		const bundle = channel.createNotificationBundle(
			{
				type: 'draw',
				count: 1,
			},
			(playerId) => {
				if (playerId === 'p2') {
					return { type: 'draw', count: 1, cardId: 'S-K' };
				}

				return undefined;
			}
		);

		expect(channel.payloadForPlayer(bundle, 'p1')).toEqual({ type: 'draw', count: 1 });
		expect(channel.payloadForPlayer(bundle, 'p2')).toEqual({ type: 'draw', count: 1, cardId: 'S-K' });
		expect(channel.payloadForPlayer(bundle, 'p3')).toEqual({ type: 'draw', count: 1 });
	});

	it('rejects unknown players in explicit private payload map', () => {
		const channel = new PrivacyChannel(['p1', 'p2'] as const);

		expect(() =>
			channel.createNotificationBundle({ type: 'noop' }, {
				p3: { type: 'secret' },
			} as unknown as Partial<Record<'p1' | 'p2', { type: string }>>)
		).toThrow('Unknown player');
	});
});
