import { describe, expect, it } from 'vitest';
import { RouteNetwork } from './route_network.js';

describe('RouteNetwork', () => {
	it('enforces distance rule when claiming nodes', () => {
		const network = new RouteNetwork<'A' | 'B' | 'C', 'e1' | 'e2', 'p1' | 'p2'>();

		network.addNode('A').addNode('B').addNode('C');
		network.addEdge('e1', 'A', 'B');
		network.addEdge('e2', 'B', 'C');

		network.claimNode('A', 'p1');
		expect(() => network.claimNode('B', 'p2', { minDistanceFromAnyClaimedNode: 1 })).toThrow('too close');
		network.claimNode('C', 'p2', { minDistanceFromAnyClaimedNode: 1 });
		expect(network.nodeOwner('C')).toBe('p2');
	});

	it('supports edge connection constraints', () => {
		const network = new RouteNetwork<'A' | 'B' | 'C', 'e1' | 'e2', 'p1' | 'p2'>();

		network.addNode('A').addNode('B').addNode('C');
		network.addEdge('e1', 'A', 'B');
		network.addEdge('e2', 'B', 'C');

		network.claimEdge('e1', 'p1', { requireConnection: true });
		network.claimEdge('e2', 'p1', { requireConnection: true });

		const isolated = new RouteNetwork<'A' | 'B' | 'C' | 'D' | 'E', 'e1' | 'e2' | 'e3', 'p1' | 'p2'>();
		isolated.addNode('A').addNode('B').addNode('C').addNode('D').addNode('E');
		isolated.addEdge('e1', 'A', 'B').addEdge('e2', 'B', 'C').addEdge('e3', 'D', 'E');
		isolated.claimEdge('e1', 'p1', { requireConnection: true });
		expect(() => isolated.claimEdge('e3', 'p1', { requireConnection: true })).toThrow('not connected');
	});

	it('computes longest route length and supports snapshots', () => {
		const network = new RouteNetwork<'A' | 'B' | 'C' | 'D' | 'E', 'e1' | 'e2' | 'e3' | 'e4', 'p1' | 'p2'>();

		network.addNode('A').addNode('B').addNode('C').addNode('D').addNode('E');
		network.addEdge('e1', 'A', 'B');
		network.addEdge('e2', 'B', 'C');
		network.addEdge('e3', 'C', 'D');
		network.addEdge('e4', 'B', 'E');

		network.claimEdge('e1', 'p1');
		network.claimEdge('e2', 'p1');
		network.claimEdge('e3', 'p1');
		network.claimEdge('e4', 'p1');

		expect(network.longestRouteLength('p1')).toBe(3);

		const restored = RouteNetwork.fromSnapshot(network.toSnapshot());
		expect(restored.longestRouteLength('p1')).toBe(3);
		expect(restored.connectedEdges('p1')).toHaveLength(4);
	});
});
