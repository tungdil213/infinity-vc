import type { Result as ResultType } from '@infinity.dev/events';
import type { IAction, IGameEngine, IGameState, IPlayer } from '../core/index.js';
import type { StateMachine } from '../state-machine/state-machine.js';
import type { AnyGameModule, GameDefinition, GameModule, GameSettingsDefinition } from './contracts.js';
import { createLauncherMachine, LauncherStates } from './orchestration-machine.js';
import type { LauncherMachineContext, LauncherMachineEvent } from './orchestration-machine.js';

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
}

export class GameLauncher {
	private readonly modules = new Map<string, AnyGameModule>();

	register<TState extends IGameState, TAction extends IAction, TSettings extends object>(
		module: GameModule<TState, TAction, TSettings>
	): void {
		if (this.modules.has(module.definition.id)) {
			throw new Error(`Game module '${module.definition.id}' is already registered`);
		}

		this.modules.set(module.definition.id, module as AnyGameModule);
	}

	listGames(): GameDefinition<Record<string, unknown>>[] {
		return Array.from(this.modules.values()).map((module) => module.definition);
	}

	getSettingsDefinition(gameId: string): GameSettingsDefinition<Record<string, unknown>> | null {
		const module = this.modules.get(gameId);
		return module?.definition.settings ?? null;
	}

	launch<TSettings extends object>(
		request: LaunchGameRequest<TSettings>
	): ResultType<LaunchedGameSession<IGameState, IAction, TSettings>, Error> {
		const module = this.modules.get(request.gameId);
		if (!module) {
			return fail(new Error(`Unknown game '${request.gameId}'`));
		}

		const validationErrors = module.definition.settings.validate(request.settings as Record<string, unknown>);
		if (validationErrors.length > 0) {
			return fail(new Error(`Invalid settings: ${validationErrors.join('; ')}`));
		}

		const resolvedSettings = this.resolveSettings(
			module.definition.settings,
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
			minPlayers: session.definition.metadata.minPlayers,
			maxPlayers: session.definition.metadata.maxPlayers,
			settings: session.settings as Record<string, unknown>,
		});

		if (initialized.isFailure) {
			return fail(initialized.error);
		}

		const transitioned = await session.machine.send('START', { type: 'START' });
		if (!transitioned) {
			return fail(new Error('Unable to start launcher machine'));
		}

		return ok(session);
	}

	private resolveSettings(
		definition: GameSettingsDefinition<Record<string, unknown>>,
		settings: Record<string, unknown>
	): Record<string, unknown> {
		const merged: Record<string, unknown> = {};
		for (const field of definition.fields) {
			merged[field.key] = settings[field.key] ?? field.defaultValue;
		}

		for (const [key, value] of Object.entries(settings)) {
			if (!(key in merged)) {
				merged[key] = value;
			}
		}

		return merged;
	}
}

export function createGameLauncher(modules: AnyGameModule[] = []): GameLauncher {
	const launcher = new GameLauncher();
	for (const module of modules) {
		launcher.register(module);
	}
	return launcher;
}
