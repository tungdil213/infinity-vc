import { describe, expect, it } from 'vitest';
import { VersionedSchemaRegistry } from './versioned_schema_registry.js';

type EventType = 'session.resumed' | 'resource.paid';

describe('VersionedSchemaRegistry', () => {
	it('upcasts to latest version by default', () => {
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
		registry.registerMigration({
			type: 'session.resumed',
			fromVersion: 2,
			toVersion: 3,
			upcast: (payload) => ({
				...(payload as object),
				restoredAt: 'n/a',
			}),
		});

		const result = registry.migrate({
			type: 'session.resumed',
			schemaVersion: 1,
			payload: { sessionId: 's-1', by: 'manual_reconnect' },
		});

		expect(result.record.schemaVersion).toBe(3);
		expect(result.record.payload).toEqual({
			sessionId: 's-1',
			reason: 'manual_reconnect',
			restoredAt: 'n/a',
		});
		expect(result.appliedMigrations.map((item) => `${item.fromVersion}->${item.toVersion}`)).toEqual(['1->2', '2->3']);
	});

	it('downcasts when target version is lower and downcast exists', () => {
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

		const result = registry.migrate(
			{
				type: 'session.resumed',
				schemaVersion: 2,
				payload: { sessionId: 's-1', reason: 'manual_reconnect' },
			},
			1
		);

		expect(result.record.schemaVersion).toBe(1);
		expect(result.record.payload).toEqual({
			sessionId: 's-1',
			by: 'manual_reconnect',
		});
		expect(result.appliedMigrations[0]?.direction).toBe('down');
	});

	it('throws when migration path is incomplete', () => {
		const registry = new VersionedSchemaRegistry<EventType>();
		registry.registerType('resource.paid', 2);

		expect(() =>
			registry.migrate({
				type: 'resource.paid',
				schemaVersion: 1,
				payload: {},
			})
		).toThrow('Missing upcast migration');
	});

	it('throws for invalid migration registration', () => {
		const registry = new VersionedSchemaRegistry<EventType>();
		expect(() =>
			registry.registerMigration({
				type: 'resource.paid',
				fromVersion: 1,
				toVersion: 3,
				upcast: (payload) => payload,
			})
		).toThrow('adjacent steps');
	});
});
