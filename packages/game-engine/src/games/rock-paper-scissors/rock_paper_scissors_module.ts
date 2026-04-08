import type { GameModule, GameSettingsDefinition } from '../../platform/contracts.js';
import { RockPaperScissorsEngine } from './application/rock_paper_scissors_engine.js';
import { RpsActionTypes, RpsMoves, type RpsAction, type RpsSettings, type RpsState } from './domain/rps_types.js';

const rpsSettingsDefinition: GameSettingsDefinition<RpsSettings> = {
	fields: [
		{
			key: 'roundsToWin',
			label: 'Rounds to win',
			description: 'Number of rounds required to win the match',
			type: 'number',
			defaultValue: 3,
			min: 1,
			max: 10,
			required: true,
		},
		{
			key: 'allowDrawReplay',
			label: 'Replay draw rounds',
			description: 'When enabled, tied rounds do not increase any player score',
			type: 'boolean',
			defaultValue: true,
		},
	],
	validate(settings) {
		const errors: string[] = [];
		const roundsToWin = Number(settings.roundsToWin ?? 3);
		if (!Number.isInteger(roundsToWin) || roundsToWin < 1 || roundsToWin > 10) {
			errors.push('roundsToWin must be an integer between 1 and 10');
		}
		return errors;
	},
};

export const rockPaperScissorsModule: GameModule<RpsState, RpsAction, RpsSettings> = {
	definition: {
		id: 'rock-paper-scissors',
		displayName: 'Rock Paper Scissors',
		description: 'Reference game module for launcher and state orchestration',
		metadata: new RockPaperScissorsEngine().metadata,
		playerConstraints: {
			minPlayers: 2,
			maxPlayers: 2,
		},
		settings: rpsSettingsDefinition,
		presentation: {
			playerView: 'raw',
		},
		capabilities: ['turn-based', 'simultaneous-turns', 'replay', 'live-play'],
		licensing: {
			distribution: 'open-source',
			license: 'MIT',
			sourceAvailable: true,
		},
		security: {
			maxActionPayloadBytes: 1024,
			allowUnknownSettings: false,
			allowSpectatorState: true,
		},
		actionDescriptors: [
			{
				actionType: RpsActionTypes.SUBMIT_MOVE,
				label: 'Submit move',
				description: 'Choose rock, paper or scissors for the current round',
				parameters: [
					{
						key: 'move',
						label: 'Move',
						type: 'enum',
						required: true,
						options: Object.values(RpsMoves).map((move) => ({
							value: move,
							label: move,
						})),
					},
				],
			},
		],
	},
	createEngine() {
		return new RockPaperScissorsEngine();
	},
};
