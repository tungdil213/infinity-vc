export interface VersionedRecord<TType extends string = string, TPayload = unknown> {
	readonly type: TType;
	readonly schemaVersion: number;
	readonly payload: TPayload;
}

export interface SchemaMigrationStep<TType extends string = string> {
	readonly type: TType;
	readonly fromVersion: number;
	readonly toVersion: number;
	readonly upcast: (payload: unknown) => unknown;
	readonly downcast?: (payload: unknown) => unknown;
}

export interface AppliedMigration<TType extends string = string> {
	readonly type: TType;
	readonly direction: 'up' | 'down';
	readonly fromVersion: number;
	readonly toVersion: number;
}

export interface SchemaMigrationResult<TType extends string = string, TPayload = unknown> {
	readonly record: VersionedRecord<TType, TPayload>;
	readonly appliedMigrations: readonly AppliedMigration<TType>[];
}

const assertPositiveInteger = (value: number, label: string): void => {
	if (!Number.isInteger(value) || value < 1) {
		throw new TypeError(`${label} must be a positive integer`);
	}
};

const migrationKey = <TType extends string>(type: TType, fromVersion: number): string => `${type}:${fromVersion}`;

export class VersionedSchemaRegistry<TType extends string = string> {
	private readonly latestVersionByType = new Map<TType, number>();
	private readonly migrationByTypeAndFromVersion = new Map<string, SchemaMigrationStep<TType>>();

	registerType(type: TType, latestVersion: number): this {
		if (!type.trim()) {
			throw new TypeError('Schema type is required');
		}

		assertPositiveInteger(latestVersion, 'Latest schema version');
		this.latestVersionByType.set(type, latestVersion);
		return this;
	}

	registerMigration(step: SchemaMigrationStep<TType>): this {
		if (!step.type.trim()) {
			throw new TypeError('Migration type is required');
		}

		assertPositiveInteger(step.fromVersion, 'Migration fromVersion');
		assertPositiveInteger(step.toVersion, 'Migration toVersion');
		if (step.toVersion !== step.fromVersion + 1) {
			throw new TypeError('Migrations must be registered as adjacent steps (toVersion = fromVersion + 1)');
		}

		const key = migrationKey(step.type, step.fromVersion);
		this.migrationByTypeAndFromVersion.set(key, step);

		const knownLatest = this.latestVersionByType.get(step.type) ?? 0;
		const nextLatest = Math.max(knownLatest, step.toVersion);
		this.latestVersionByType.set(step.type, nextLatest);
		return this;
	}

	getLatestVersion(type: TType): number | null {
		return this.latestVersionByType.get(type) ?? null;
	}

	migrate<TPayload = unknown>(
		record: VersionedRecord<TType, TPayload>,
		targetVersion?: number
	): SchemaMigrationResult<TType, TPayload> {
		assertPositiveInteger(record.schemaVersion, 'Record schemaVersion');
		const resolvedTargetVersion = targetVersion ?? this.getLatestVersion(record.type) ?? record.schemaVersion;
		assertPositiveInteger(resolvedTargetVersion, 'Target schema version');

		if (resolvedTargetVersion === record.schemaVersion) {
			return {
				record,
				appliedMigrations: [],
			};
		}

		if (resolvedTargetVersion > record.schemaVersion) {
			return this.migrateUp(record, resolvedTargetVersion);
		}

		return this.migrateDown(record, resolvedTargetVersion);
	}

	private migrateUp<TPayload = unknown>(
		record: VersionedRecord<TType, TPayload>,
		targetVersion: number
	): SchemaMigrationResult<TType, TPayload> {
		let currentVersion = record.schemaVersion;
		let payload: unknown = record.payload;
		const appliedMigrations: AppliedMigration<TType>[] = [];

		while (currentVersion < targetVersion) {
			const migration = this.migrationByTypeAndFromVersion.get(migrationKey(record.type, currentVersion));
			if (!migration) {
				throw new Error(`Missing upcast migration for type=${record.type} from version ${currentVersion}`);
			}

			payload = migration.upcast(payload);
			appliedMigrations.push({
				type: migration.type,
				direction: 'up',
				fromVersion: migration.fromVersion,
				toVersion: migration.toVersion,
			});
			currentVersion = migration.toVersion;
		}

		return {
			record: {
				type: record.type,
				schemaVersion: currentVersion,
				payload: payload as TPayload,
			},
			appliedMigrations,
		};
	}

	private migrateDown<TPayload = unknown>(
		record: VersionedRecord<TType, TPayload>,
		targetVersion: number
	): SchemaMigrationResult<TType, TPayload> {
		let currentVersion = record.schemaVersion;
		let payload: unknown = record.payload;
		const appliedMigrations: AppliedMigration<TType>[] = [];

		while (currentVersion > targetVersion) {
			const previousVersion = currentVersion - 1;
			const migration = this.migrationByTypeAndFromVersion.get(migrationKey(record.type, previousVersion));
			if (!migration || !migration.downcast) {
				throw new Error(`Missing downcast migration for type=${record.type} from version ${currentVersion}`);
			}

			payload = migration.downcast(payload);
			appliedMigrations.push({
				type: migration.type,
				direction: 'down',
				fromVersion: migration.toVersion,
				toVersion: migration.fromVersion,
			});
			currentVersion = migration.fromVersion;
		}

		return {
			record: {
				type: record.type,
				schemaVersion: currentVersion,
				payload: payload as TPayload,
			},
			appliedMigrations,
		};
	}
}
