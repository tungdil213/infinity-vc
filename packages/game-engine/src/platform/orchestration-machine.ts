import { StateMachineBuilder, type StateMachine } from '../state-machine/state-machine.js';

export const LauncherStates = {
	IDLE: 'idle',
	GAME_SELECTED: 'game_selected',
	CONFIGURED: 'configured',
	RUNNING: 'running',
	FINISHED: 'finished',
} as const;

export type LauncherState = (typeof LauncherStates)[keyof typeof LauncherStates];

export type LauncherMachineEvent =
	| { type: 'SELECT_GAME'; gameId: string }
	| { type: 'CONFIGURE'; settings: Record<string, unknown> }
	| { type: 'START' }
	| { type: 'FINISH'; winnerId: string | null }
	| { type: 'RESET' };

export interface LauncherMachineContext {
	selectedGameId: string | null;
	settings: Record<string, unknown>;
	startedAt: Date | null;
	finishedAt: Date | null;
	winnerId: string | null;
}

const initialContext: LauncherMachineContext = {
	selectedGameId: null,
	settings: {},
	startedAt: null,
	finishedAt: null,
	winnerId: null,
};

export function createLauncherMachine(
	context: Partial<LauncherMachineContext> = {}
): StateMachine<LauncherMachineContext, LauncherMachineEvent> {
	const machineContext: LauncherMachineContext = {
		...initialContext,
		...context,
	};

	return new StateMachineBuilder<LauncherMachineContext, LauncherMachineEvent>()
		.initial(LauncherStates.IDLE)
		.state(LauncherStates.IDLE)
		.state(LauncherStates.GAME_SELECTED)
		.state(LauncherStates.CONFIGURED)
		.state(LauncherStates.RUNNING)
		.finalState(LauncherStates.FINISHED)
		.transition(LauncherStates.IDLE, LauncherStates.GAME_SELECTED, 'SELECT_GAME', {
			action: (ctx, event) => {
				if (event.type !== 'SELECT_GAME') return;
				ctx.selectedGameId = event.gameId;
				ctx.settings = {};
				ctx.startedAt = null;
				ctx.finishedAt = null;
				ctx.winnerId = null;
			},
		})
		.transition(LauncherStates.GAME_SELECTED, LauncherStates.CONFIGURED, 'CONFIGURE', {
			action: (ctx, event) => {
				if (event.type !== 'CONFIGURE') return;
				ctx.settings = { ...event.settings };
			},
		})
		.transition(LauncherStates.CONFIGURED, LauncherStates.RUNNING, 'START', {
			action: (ctx) => {
				ctx.startedAt = new Date();
				ctx.finishedAt = null;
				ctx.winnerId = null;
			},
		})
		.transition(LauncherStates.RUNNING, LauncherStates.FINISHED, 'FINISH', {
			action: (ctx, event) => {
				if (event.type !== 'FINISH') return;
				ctx.finishedAt = new Date();
				ctx.winnerId = event.winnerId;
			},
		})
		.transition(LauncherStates.FINISHED, LauncherStates.IDLE, 'RESET', {
			action: (ctx) => {
				ctx.selectedGameId = null;
				ctx.settings = {};
				ctx.startedAt = null;
				ctx.finishedAt = null;
				ctx.winnerId = null;
			},
		})
		.build(machineContext);
}
