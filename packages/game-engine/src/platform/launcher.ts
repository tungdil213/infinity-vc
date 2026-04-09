import type { Result as ResultType } from '@infinity.dev/events';
import type { IAction, IGameEngine, IGameState, IPlayer } from '../core/index.js';
import type { StateMachine } from '../state-machine/state-machine.js';
import type {
	AnyGameModule,
	GameCapability,
	GameDefinition,
	GameLicensing,
	GameModule,
	GameSettingsDefinition,
} from './contracts.js';
import { createLauncherMachine, LauncherStates } from './orchestration-machine.js';
import type { LauncherMachineContext, LauncherMachineEvent } from './orchestration-machine.js';

const MODULE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DEFAULT_LICENSING: GameLicensing = {
	distribution: 'open-source',
	sourceAvailable: true,
};

function ok<T>(value: T): ResultType<T, Error> {
	return {
		isSuccess: true,
		isFailure: false,
		value,
	} as ResultType<T, Error>;
}

function fail<T>(error: Error): ResultType<T, Error> {
	return {
		isSuccess: false,
		isFailure: true,
		error,
	} as ResultType<T, Error>;
}

export interface LaunchGameRequest<TSettings extends object> {
	readonly gameId: string;
	readonly players: IPlayer[];
	readonly settings: Partial<TSettings>;
}

export interface GameCatalogFilter {
	readonly includeProprietary?: boolean;
	readonly requiredCapabilities?: readonly GameCapability[];
}

export interface GameCatalogEntry {
	readonly id: string;
	readonly displayName: string;
	readonly description: string;
	readonly metadata: {
		readonly gameType: string;
		readonly version: string;
		readonly estimatedDuration: string;
		readonly complexity: 'simple' | 'medium' | 'complex';
	};
	readonly playerConstraints: {
		readonly minPlayers: number;
		readonly maxPlayers: number;
	};
	readonly capabilities: readonly GameCapability[];
	readonly licensing: GameLicensing;
	readonly settingsSchema: {
		readonly requiredKeys: readonly string[];
		readonly optionalKeys: readonly string[];
	};
}

export interface LaunchedGameSession<
	TState extends IGameState = IGameState,
	TAction extends IAction = IAction,
	TSettings extends object = Record<string, unknown>,
> {
	readonly definition: GameDefinition<TSettings>;
	readonly engine: IGameEngine<TState, TAction>;
	readonly machine: StateMachine<LauncherMachineContext, LauncherMachineEvent>;
	readonly players: readonly IPlayer[];
	readonly settings: TSettings;
	readonly state: TState | null;
}

export class GameLauncher {
	private readonly modules = new Map<string, AnyGameModule>();

	register<TState extends IGameState, TAction extends IAction, TSettings extends object>(
		module: GameModule<TState, TAction, TSettings>
	): void {
		if (this.modules.has(module.definition.id)) {
			throw new Error(`Game module '${module.definition.id}' is already registered`);
		}

		this.validateModuleDefinition(module as AnyGameModule);
		this.modules.set(module.definition.id, module as AnyGameModule);
	}

	listGames(): GameDefinition<Record<string, unknown>>[] {
		return Array.from(this.modules.values()).map((module) => module.definition);
	}

	listCatalog(filter: GameCatalogFilter = {}): GameCatalogEntry[] {
		const includeProprietary = filter.includeProprietary ?? true;
		const requiredCapabilities = filter.requiredCapabilities ?? [];

		return this.listGames()
			.map((definition) => this.toCatalogEntry(definition))
			.filter((entry) => includeProprietary || entry.licensing.distribution !== 'proprietary')
			.filter((entry) =>
				requiredCapabilities.every((requiredCapability) =>
					entry.capabilities.includes(requiredCapability)
				)
			);
	}

	listOpenSourceGames(): GameCatalogEntry[] {
		return this.listCatalog({ includeProprietary: false });
	}

	getSettingsDefinition(gameId: string): GameSettingsDefinition<Record<string, unknown>> | null {
		const module = this.modules.get(gameId);
		return module?.definition.settings ?? null;
	}

	getGameDefinition(gameId: string): GameDefinition<Record<string, unknown>> | null {
		const module = this.modules.get(gameId);
		return module?.definition ?? null;
	}

	canLaunch(gameId: string, playerCount: number): ResultType<void, Error> {
		const module = this.modules.get(gameId);
		if (!module) {
			return fail(new Error(`Unknown game '${gameId}'`));
		}

		const { minPlayers, maxPlayers } = module.definition.playerConstraints;
		if (playerCount < minPlayers || playerCount > maxPlayers) {
			return fail(
				new Error(
					`Invalid player count for '${module.definition.id}': expected between ${minPlayers} and ${maxPlayers}, received ${playerCount}`
				)
			);
		}

		return ok(undefined);
	}

	launch<TSettings extends object>(
		request: LaunchGameRequest<TSettings>
	): ResultType<LaunchedGameSession<IGameState, IAction, TSettings>, Error> {
		const module = this.modules.get(request.gameId);
		if (!module) {
			return fail(new Error(`Unknown game '${request.gameId}'`));
		}

		const launchEligibility = this.canLaunch(request.gameId, request.players.length);
		if (launchEligibility.isFailure) {
			return fail(launchEligibility.error);
		}

		const knownSettingKeys = new Set(module.definition.settings.fields.map((field) => field.key));
		const unknownSettingKeys = Object.keys(request.settings as Record<string, unknown>).filter(
			(settingKey) => !knownSettingKeys.has(settingKey)
		);
		const allowUnknownSettings = module.definition.security?.allowUnknownSettings ?? false;
		if (unknownSettingKeys.length > 0 && !allowUnknownSettings) {
			return fail(new Error(`Unknown settings: ${unknownSettingKeys.join(', ')}`));
		}

		const validationErrors = module.definition.settings.validate(request.settings as Record<string, unknown>);
		if (validationErrors.length > 0) {
			return fail(new Error(`Invalid settings: ${validationErrors.join('; ')}`));
		}

		const resolvedSettings = this.resolveSettings(
			module.definition,
			request.settings as Record<string, unknown>
		) as TSettings;

		const machine = createLauncherMachine({
			selectedGameId: module.definition.id,
			settings: resolvedSettings as Record<string, unknown>,
		});

		const session: LaunchedGameSession<IGameState, IAction, TSettings> = {
			definition: module.definition,
			engine: module.createEngine(),
			machine,
			players: request.players,
			settings: resolvedSettings,
			state: null,
		};

		return ok(session);
	}

	async startSession<TSettings extends object>(
		session: LaunchedGameSession<IGameState, IAction, TSettings>
	): Promise<ResultType<LaunchedGameSession<IGameState, IAction, TSettings>, Error>> {
		if (session.machine.currentState === LauncherStates.IDLE) {
			await session.machine.send('SELECT_GAME', {
				type: 'SELECT_GAME',
				gameId: session.definition.id,
			});
		}

		if (session.machine.currentState === LauncherStates.GAME_SELECTED) {
			await session.machine.send('CONFIGURE', {
				type: 'CONFIGURE',
				settings: session.settings as Record<string, unknown>,
			});
		}

		if (session.machine.currentState !== LauncherStates.CONFIGURED) {
			return fail(new Error('Unable to configure launcher machine'));
		}

		const initialized = session.engine.initialize(session.players as IPlayer[], {
			gameType: session.definition.metadata.gameType,
			minPlayers: session.definition.playerConstraints.minPlayers,
			maxPlayers: session.definition.playerConstraints.maxPlayers,
			settings: session.settings as Record<string, unknown>,
		});

		if (initialized.isFailure) {
			return fail(initialized.error);
		}

		const transitioned = await session.machine.send('START', { type: 'START' });
		if (!transitioned) {
			return fail(new Error('Unable to start launcher machine'));
		}

		return ok({
			...session,
			state: initialized.value,
		});
	}

	private resolveSettings(
		definition: GameDefinition<Record<string, unknown>>,
		settings: Record<string, unknown>
	): Record<string, unknown> {
		const merged: Record<string, unknown> = {};
		for (const field of definition.settings.fields) {
			merged[field.key] = settings[field.key] ?? field.defaultValue;
		}

		if (definition.security?.allowUnknownSettings === true) {
			for (const [key, value] of Object.entries(settings)) {
				if (!(key in merged)) {
					merged[key] = value;
				}
			}
		}

		return merged;
	}

	private validateModuleDefinition(module: AnyGameModule): void {
		const definition = module.definition;
		if (!MODULE_ID_PATTERN.test(definition.id)) {
			throw new Error(
				`Invalid game module id '${definition.id}'. Only lowercase letters, numbers and dashes are allowed`
			);
		}

		const { minPlayers, maxPlayers } = definition.playerConstraints;
		if (!Number.isInteger(minPlayers) || !Number.isInteger(maxPlayers) || minPlayers < 1 || minPlayers > maxPlayers) {
			throw new Error(
				`Invalid player constraints for '${definition.id}': minPlayers must be >= 1 and <= maxPlayers`
			);
		}

		const settingKeys = new Set<string>();
		for (const field of definition.settings.fields) {
			if (settingKeys.has(field.key)) {
				throw new Error(`Duplicate setting key '${field.key}' in game module '${definition.id}'`);
			}
			settingKeys.add(field.key);

			if (field.type === 'select' && (!field.options || field.options.length === 0)) {
				throw new Error(
					`Setting '${field.key}' in game module '${definition.id}' uses 'select' type but does not define options`
				);
			}
		}

		const actionTypes = new Set<string>();
		for (const descriptor of definition.actionDescriptors ?? []) {
			if (actionTypes.has(descriptor.actionType)) {
				throw new Error(
					`Duplicate action descriptor '${descriptor.actionType}' in game module '${definition.id}'`
				);
			}
			actionTypes.add(descriptor.actionType);
		}
	}

	private toCatalogEntry(definition: GameDefinition<Record<string, unknown>>): GameCatalogEntry {
		const requiredKeys = definition.settings.fields
			.filter((field) => field.required === true)
			.map((field) => field.key);
		const optionalKeys = definition.settings.fields
			.filter((field) => field.required !== true)
			.map((field) => field.key);

		return {
			id: definition.id,
			displayName: definition.displayName,
			description: definition.description,
			metadata: {
				gameType: definition.metadata.gameType,
				version: definition.metadata.version,
				estimatedDuration: definition.metadata.estimatedDuration,
				complexity: definition.metadata.complexity,
			},
			playerConstraints: {
				minPlayers: definition.playerConstraints.minPlayers,
				maxPlayers: definition.playerConstraints.maxPlayers,
			},
			capabilities: definition.capabilities ?? ['turn-based'],
			licensing: definition.licensing ?? DEFAULT_LICENSING,
			settingsSchema: {
				requiredKeys,
				optionalKeys,
			},
		};
	}
}

export function createGameLauncher(modules: AnyGameModule[] = []): GameLauncher {
	const launcher = new GameLauncher();
	for (const module of modules) {
		launcher.register(module);
	}
	return launcher;
}
