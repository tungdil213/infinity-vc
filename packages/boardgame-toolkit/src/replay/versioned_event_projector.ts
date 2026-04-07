import type {
	AppliedMigration,
	VersionedRecord,
	VersionedSchemaRegistry,
} from '../schema/versioned_schema_registry.js';
import type { MatchEvent } from './event_log.js';

export interface ProjectedMatchEvent<TType extends string = string, TPayload = unknown> {
	readonly event: MatchEvent<TPayload>;
	readonly appliedMigrations: readonly AppliedMigration<TType>[];
}

export class VersionedEventProjector<TType extends string = string> {
	constructor(private readonly registry: VersionedSchemaRegistry<TType>) {}

	projectEvent<TPayload>(event: MatchEvent<TPayload>, targetVersion?: number): ProjectedMatchEvent<TType, TPayload> {
		const record: VersionedRecord<TType, TPayload> = {
			type: event.type as TType,
			schemaVersion: event.schemaVersion ?? 1,
			payload: event.payload,
		};

		const migrated = this.registry.migrate(record, targetVersion);
		return {
			event: {
				...event,
				schemaVersion: migrated.record.schemaVersion,
				payload: migrated.record.payload,
			},
			appliedMigrations: migrated.appliedMigrations,
		};
	}

	projectEvents(
		events: readonly MatchEvent[],
		targetVersionByType: Partial<Record<TType, number>> = {}
	): readonly ProjectedMatchEvent<TType>[] {
		return events.map((event) => {
			const targetVersion = targetVersionByType[event.type as TType];
			return this.projectEvent(event, targetVersion);
		});
	}
}
