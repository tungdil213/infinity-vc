import { createStateMachine, type StateMachine } from '../../../state-machine/state-machine.js';
import type { RpsState } from '../domain/rps_types.js';

export interface RpsMachineEvent {
	type: 'MOVES_SUBMITTED' | 'NEXT_ROUND' | 'FINISH_GAME';
}

export function createRpsMachine(initialState: RpsState): StateMachine<RpsState, RpsMachineEvent> {
	return createStateMachine<RpsState, RpsMachineEvent>()
		.initial('waiting_move')
		.state('waiting_move')
		.state('round_result')
		.finalState('game_over')
		.transition('waiting_move', 'round_result', 'MOVES_SUBMITTED')
		.transition('round_result', 'waiting_move', 'NEXT_ROUND')
		.transition('round_result', 'game_over', 'FINISH_GAME')
		.build(initialState);
}
