import type { IAction, IGameState } from '../../../core/index.js';

export const RpsMoves = {
	ROCK: 'rock',
	PAPER: 'paper',
	SCISSORS: 'scissors',
} as const;

export type RpsMove = (typeof RpsMoves)[keyof typeof RpsMoves];

export interface RpsSettings {
	readonly roundsToWin: number;
	readonly allowDrawReplay: boolean;
}

export interface RpsRoundSnapshot {
	readonly round: number;
	readonly winnerId: string | null;
	readonly choices: Record<string, RpsMove>;
}

export interface RpsState extends IGameState {
	readonly phase: 'waiting_move' | 'round_result' | 'game_over';
	readonly scores: Record<string, number>;
	readonly roundChoices: Record<string, RpsMove>;
	readonly roundsToWin: number;
	readonly allowDrawReplay: boolean;
	readonly rounds: RpsRoundSnapshot[];
}

export interface SubmitMovePayload {
	readonly move: RpsMove;
}

export const RpsActionTypes = {
	SUBMIT_MOVE: 'submit_move',
} as const;

export type RpsActionType = (typeof RpsActionTypes)[keyof typeof RpsActionTypes];

export interface RpsAction extends IAction<SubmitMovePayload> {
	readonly type: RpsActionType;
}
