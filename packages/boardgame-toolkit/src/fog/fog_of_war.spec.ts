import { describe, expect, it } from 'vitest';
import { FogOfWar } from './fog_of_war.js';

type PlayerId = 'alice' | 'bob';

type CellId = 'A1' | 'A2' | 'A3' | 'B1';

const allCells: CellId[] = ['A1', 'A2', 'A3', 'B1'];

describe('FogOfWar', () => {
	it('reveals with neighbors depth and keeps explored after conceal', () => {
		const fog = new FogOfWar<PlayerId, CellId>({
			neighborsByCell: {
				A1: ['A2'],
				A2: ['A1', 'A3'],
				A3: ['A2'],
			},
		});

		fog.revealForPlayer('alice', ['A1'], { neighborsDepth: 1 });
		let aliceView = fog.projectForAudience({ kind: 'player', playerId: 'alice' }, allCells);
		expect(aliceView.cells.A1).toBe('visible');
		expect(aliceView.cells.A2).toBe('visible');
		expect(aliceView.cells.A3).toBe('hidden');

		fog.concealForPlayer('alice');
		aliceView = fog.projectForAudience({ kind: 'player', playerId: 'alice' }, allCells);
		expect(aliceView.cells.A1).toBe('explored');
		expect(aliceView.cells.A2).toBe('explored');
		expect(aliceView.cells.A3).toBe('hidden');
	});

	it('does not leak private player visibility to public audiences', () => {
		const fog = new FogOfWar<PlayerId, CellId>();
		fog.revealForPlayer('alice', ['A1', 'A2']);
		fog.revealPublic(['B1']);

		const publicView = fog.projectForAudience({ kind: 'public' }, allCells);
		expect(publicView.cells.A1).toBe('hidden');
		expect(publicView.cells.A2).toBe('hidden');
		expect(publicView.cells.B1).toBe('visible');

		const spectatorView = fog.projectForAudience({ kind: 'spectator' }, allCells);
		expect(spectatorView.cells.A1).toBe('hidden');
		expect(spectatorView.cells.B1).toBe('visible');
	});

	it('falls back to public projection when player id is absent', () => {
		const fog = new FogOfWar<PlayerId, CellId>();
		fog.revealForPlayer('alice', ['A1']);
		fog.revealPublic(['A3']);

		const unknownPlayerView = fog.projectForAudience({ kind: 'player' }, allCells);
		expect(unknownPlayerView.cells.A1).toBe('hidden');
		expect(unknownPlayerView.cells.A3).toBe('visible');
	});

	it('supports snapshot restore', () => {
		const fog = new FogOfWar<PlayerId, CellId>();
		fog.revealForPlayer('alice', ['A1']);
		fog.revealPublic(['A2']);
		const snapshot = fog.toSnapshot();

		const restored = FogOfWar.fromSnapshot<PlayerId, CellId>(snapshot);
		const view = restored.projectForAudience({ kind: 'player', playerId: 'alice' }, allCells);
		expect(view.cells.A1).toBe('visible');
		expect(view.cells.A2).toBe('visible');
	});
});
