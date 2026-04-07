import { describe, expect, it } from 'vitest';
import { VersionedSchemaRegistry } from '../schema/versioned_schema_registry.js';
import { VersionedEventProjector } from './versioned_event_projector.js';

type EventType = 'session.resumed' | 'score.updated';

describe('VersionedEventProjector', () => {
	it('projects event payloads to target schema version', () => {
		const registry = new VersionedSchemaRegistry<EventType>();
		registry.registerMigration({
			type: 'session.resumed',
			fromVersion: 1,
			toVersion: 2,
			upcast: (payload) => {
				const value = payload as { sessionId: string; by: string };
				return {
					sessionId: value.sessionId,
					reason: value.by,
				};
			},
			downcast: (payload) => {
				const value = payload as { sessionId: string; reason: string };
				return {
					sessionId: value.sessionId,
					by: value.reason,
				};
			},
		});

		const projector = new VersionedEventProjector(registry);
		const projection = projector.projectEvent(
			{
				id: 1,
				type: 'session.resumed',
				schemaVersion: 1,
				payload: { sessionId: 's-1', by: 'manual_reconnect' },
				timestamp: '2026-01-01T00:00:00.000Z',
			},
			2
		);

		expect(projection.event.schemaVersion).toBe(2);
		expect(projection.event.payload).toEqual({
			sessionId: 's-1',
			reason: 'manual_reconnect',
		});
		expect(projection.appliedMigrations).toHaveLength(1);
	});

	it('supports batch projection with per-type target versions', () => {
		const registry = new VersionedSchemaRegistry<EventType>();
		registry.registerMigration({
			type: 'session.resumed',
			fromVersion: 1,
			toVersion: 2,
			upcast: (payload) => payload,
		});

		const projector = new VersionedEventProjector(registry);
		const projections = projector.projectEvents(
			[
				{
					id: 1,
					type: 'session.resumed',
					schemaVersion: 1,
					payload: { sessionId: 's-1' },
					timestamp: '2026-01-01T00:00:00.000Z',
				},
				{
					id: 2,
					type: 'score.updated',
					schemaVersion: 1,
					payload: { score: 10 },
					timestamp: '2026-01-01T00:00:01.000Z',
				},
			],
			{
				'session.resumed': 2,
			}
		);

		expect(projections[0]?.event.schemaVersion).toBe(2);
		expect(projections[1]?.event.schemaVersion).toBe(1);
		expect(projections[0]?.appliedMigrations).toHaveLength(1);
		expect(projections[1]?.appliedMigrations).toHaveLength(0);
	});
});
