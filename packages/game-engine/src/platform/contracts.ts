import type { IGameEngine, IGameMetadata, IGameState, IAction } from '../core/index.js';

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

export interface GameDefinition<TSettings extends object> {
	readonly id: string;
	readonly displayName: string;
	readonly description: string;
	readonly metadata: IGameMetadata;
	readonly playerConstraints: GamePlayerConstraints;
	readonly settings: GameSettingsDefinition<TSettings>;
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
