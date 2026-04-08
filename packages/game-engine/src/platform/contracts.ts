import type { IGameEngine, IGameMetadata, IGameState, IAction } from '../core/index.js';

export type GameDistribution = 'open-source' | 'proprietary';

export type GameCapability =
	| 'turn-based'
	| 'simultaneous-turns'
	| 'hidden-information'
	| 'spectator-mode'
	| 'replay'
	| 'async-play'
	| 'live-play'
	| 'bot-players'
	| 'custom-assets'
	| 'deterministic-rng';

export interface GameLicensing {
	readonly distribution: GameDistribution;
	readonly license?: string;
	readonly sourceAvailable?: boolean;
}

export interface GameSecurityPolicy {
	readonly maxActionPayloadBytes?: number;
	readonly allowUnknownSettings?: boolean;
	readonly allowSpectatorState?: boolean;
}

export type ActionParameterType = 'number' | 'boolean' | 'string' | 'enum';

export interface ActionParameterOption {
	readonly value: string;
	readonly label: string;
}

export interface GameActionParameterDescriptor {
	readonly key: string;
	readonly label: string;
	readonly type: ActionParameterType;
	readonly description?: string;
	readonly required?: boolean;
	readonly options?: readonly ActionParameterOption[];
}

export interface GameActionDescriptor {
	readonly actionType: string;
	readonly label: string;
	readonly description: string;
	readonly parameters?: readonly GameActionParameterDescriptor[];
}

export type GameSettingFieldType = 'number' | 'boolean' | 'select' | 'string';

export interface GameSettingOption {
	readonly value: string;
	readonly label: string;
}

export interface GameSettingField {
	readonly key: string;
	readonly label: string;
	readonly description?: string;
	readonly type: GameSettingFieldType;
	readonly required?: boolean;
	readonly defaultValue: unknown;
	readonly min?: number;
	readonly max?: number;
	readonly options?: readonly GameSettingOption[];
}

export interface GameSettingsDefinition<TSettings extends object> {
	readonly fields: readonly GameSettingField[];
	validate(settings: Partial<TSettings>): string[];
}

export interface GamePlayerConstraints {
	readonly minPlayers: number;
	readonly maxPlayers: number;
}

export type GamePlayerViewMode = 'raw' | 'hidden-hand-player-list';

export interface GamePresentationDefinition {
	readonly playerView?: GamePlayerViewMode;
}

export interface GameDefinition<TSettings extends object> {
	readonly id: string;
	readonly displayName: string;
	readonly description: string;
	readonly metadata: IGameMetadata;
	readonly playerConstraints: GamePlayerConstraints;
	readonly settings: GameSettingsDefinition<TSettings>;
	readonly presentation?: GamePresentationDefinition;
	readonly capabilities?: readonly GameCapability[];
	readonly licensing?: GameLicensing;
	readonly security?: GameSecurityPolicy;
	readonly actionDescriptors?: readonly GameActionDescriptor[];
}

export interface GameModule<
	TState extends IGameState = IGameState,
	TAction extends IAction = IAction,
	TSettings extends object = Record<string, unknown>,
> {
	readonly definition: GameDefinition<TSettings>;
	createEngine(): IGameEngine<TState, TAction>;
}

export type AnyGameModule = GameModule<IGameState, IAction, Record<string, unknown>>;
