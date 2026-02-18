import type { Result } from '@infinity.dev/events';
import { BaseGameEngine } from '../../../core/engine.js';
import type { IActionResult, IGameConfig, IGameEvent, IGameMetadata, IPlayer } from '../../../core/types.js';
import { createRpsMachine } from './rps_machine.js';
import { isRpsMove, resolveRoundWinner } from '../domain/rps_rules.js';
import {
	RpsActionTypes,
	type RpsAction,
	type RpsMove,
	type RpsRoundSnapshot,
	type RpsSettings,
	type RpsState,
} from '../domain/rps_types.js';

const defaultSettings: RpsSettings = {
	roundsToWin: 3,
	allowDrawReplay: true,
};

export class RockPaperScissorsEngine extends BaseGameEngine<RpsState, RpsAction> {
	readonly metadata: IGameMetadata = {
		gameType: 'rock-paper-scissors',
		version: '1.0.0',
		description: 'Simple simultaneous duel game with configurable rounds',
		minPlayers: 2,
		maxPlayers: 2,
		estimatedDuration: '5 minutes',
		complexity: 'simple',
	};

	initialize(players: IPlayer[], config?: Partial<IGameConfig>): Result<RpsState, Error> {
		if (players.length !== 2) {
			return this.failResult(new Error('Rock Paper Scissors requires exactly 2 players'));
		}

		const settings = this.resolveSettings(config?.settings);
		const scores: Record<string, number> = {};
		for (const player of players) {
			scores[player.id] = 0;
		}

		const initialState: RpsState = {
			gameId: crypto.randomUUID(),
			phase: 'waiting_move',
			currentPlayerId: null,
			players,
			round: 1,
			turn: 1,
			isFinished: false,
			winnerId: null,
			scores,
			roundChoices: {},
			roundsToWin: settings.roundsToWin,
			allowDrawReplay: settings.allowDrawReplay,
			rounds: [],
		};

		return this.successResult(initialState);
	}

	override validateAction(state: RpsState, action: RpsAction): Result<void, Error> {
		if (state.isFinished) {
			return this.failResult(new Error('Game is already finished'));
		}

		const availableActions = this.getAvailableActions(state, action.playerId);
		if (!availableActions.includes(action.type)) {
			return this.failResult(new Error(`Action ${action.type} is not available`));
		}

		return this.validateActionSpecific(state, action);
	}

	protected validateActionSpecific(state: RpsState, action: RpsAction): Result<void, Error> {
		if (action.type !== RpsActionTypes.SUBMIT_MOVE) {
			return this.failResult(new Error(`Unsupported action: ${action.type}`));
		}

		if (!isRpsMove(action.payload.move)) {
			return this.failResult(new Error(`Invalid move: ${action.payload.move}`));
		}

		if (!state.players.some((player) => player.id === action.playerId)) {
			return this.failResult(new Error(`Unknown player ${action.playerId}`));
		}

		if (state.roundChoices[action.playerId]) {
			return this.failResult(new Error('Player already submitted a move for this round'));
		}

		return this.successResult(undefined);
	}

	executeAction(state: RpsState, action: RpsAction): Result<IActionResult<RpsState>, Error> {
		const validation = this.validateAction(state, action);
		if (validation.isFailure) {
			return this.failResult(validation.error);
		}

		const updatedRoundChoices = {
			...state.roundChoices,
			[action.playerId]: action.payload.move,
		};

		const players = state.players;
		if (players.length !== 2) {
			return this.failResult(new Error('Rock Paper Scissors requires 2 players in state'));
		}

		if (!updatedRoundChoices[players[0].id] || !updatedRoundChoices[players[1].id]) {
			const waitingState: RpsState = {
				...state,
				roundChoices: updatedRoundChoices,
			};

			return this.successResult({
				success: true,
				newState: waitingState,
				events: [
					this.buildEvent('rps.move_submitted', {
						playerId: action.playerId,
						round: state.round,
					}),
				],
			});
		}

		const [firstPlayer, secondPlayer] = players;
		const firstMove = updatedRoundChoices[firstPlayer.id] as RpsMove;
		const secondMove = updatedRoundChoices[secondPlayer.id] as RpsMove;
		const winnerIndex = resolveRoundWinner(firstMove, secondMove);
		const roundWinnerId = winnerIndex === null ? null : players[winnerIndex].id;
		const updatedScores = { ...state.scores };
		if (roundWinnerId) {
			updatedScores[roundWinnerId] += 1;
		}

		const roundSnapshot: RpsRoundSnapshot = {
			round: state.round,
			winnerId: roundWinnerId,
			choices: updatedRoundChoices,
		};

		const gameWinnerId = Object.entries(updatedScores).find(([, score]) => score >= state.roundsToWin)?.[0] ?? null;
		const isFinished = gameWinnerId !== null;

		const shouldReplayRound = !roundWinnerId && state.allowDrawReplay;

		const nextState: RpsState = {
			...state,
			phase: isFinished ? 'game_over' : 'round_result',
			turn: state.turn + 1,
			round: shouldReplayRound ? state.round : state.round + 1,
			isFinished,
			winnerId: gameWinnerId,
			scores: updatedScores,
			roundChoices: isFinished ? updatedRoundChoices : {},
			rounds: [...state.rounds, roundSnapshot],
		};

		const machine = createRpsMachine(state);
		void machine.send('MOVES_SUBMITTED', { type: 'MOVES_SUBMITTED' });
		if (isFinished) {
			void machine.send('FINISH_GAME', { type: 'FINISH_GAME' });
		} else {
			void machine.send('NEXT_ROUND', { type: 'NEXT_ROUND' });
		}

		return this.successResult({
			success: true,
			newState: nextState,
			events: [
				this.buildEvent('rps.round_completed', {
					round: roundSnapshot.round,
					winnerId: roundSnapshot.winnerId,
					choices: roundSnapshot.choices,
					scores: nextState.scores,
				}),
				...(isFinished
					? [
							this.buildEvent('rps.game_finished', {
								winnerId: nextState.winnerId,
								rounds: nextState.rounds,
								scores: nextState.scores,
							}),
						]
					: []),
			],
		});
	}

	getAvailableActions(state: RpsState, playerId: string): string[] {
		if (state.isFinished) {
			return [];
		}

		if (!state.players.some((player) => player.id === playerId)) {
			return [];
		}

		if (state.roundChoices[playerId]) {
			return [];
		}

		return [RpsActionTypes.SUBMIT_MOVE];
	}

	protected filterStateForPlayer(state: RpsState, playerId: string): Partial<RpsState> {
		const allMovesSubmitted = state.players.every((player) => state.roundChoices[player.id] !== undefined);
		const sanitizedChoices = allMovesSubmitted
			? state.roundChoices
			: state.roundChoices[playerId]
				? { [playerId]: state.roundChoices[playerId] }
				: {};

		return {
			...state,
			roundChoices: sanitizedChoices,
		};
	}

	private resolveSettings(rawSettings: unknown): RpsSettings {
		const partial = (rawSettings as Partial<RpsSettings>) ?? {};
		const roundsToWin = Math.max(1, Number(partial.roundsToWin ?? defaultSettings.roundsToWin));

		return {
			roundsToWin,
			allowDrawReplay: partial.allowDrawReplay ?? defaultSettings.allowDrawReplay,
		};
	}

	private buildEvent(type: string, payload: unknown): IGameEvent {
		return {
			type,
			payload,
			visibility: { type: 'public' },
			timestamp: new Date(),
		};
	}

	private successResult<TValue>(value: TValue): Result<TValue, Error> {
		return {
			isSuccess: true,
			isFailure: false,
			value,
		} as Result<TValue, Error>;
	}

	private failResult<TValue>(error: Error): Result<TValue, Error> {
		return {
			isSuccess: false,
			isFailure: true,
			error,
		} as Result<TValue, Error>;
	}
}
