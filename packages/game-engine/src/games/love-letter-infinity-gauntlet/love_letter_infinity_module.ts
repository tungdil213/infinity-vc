import type { GameModule, GameSettingsDefinition } from '../../platform/contracts.js';
import { LoveLetterInfinityEngine } from './application/love_letter_infinity_engine.js';
import type {
	LoveLetterInfinityAction,
	LoveLetterInfinitySettings,
	LoveLetterInfinityState,
} from './domain/love_letter_infinity_types.js';
import { LoveLetterInfinityActionTypes, LoveLetterInfinityCardTypes } from './domain/love_letter_infinity_types.js';

const loveLetterInfinitySettingsDefinition: GameSettingsDefinition<LoveLetterInfinitySettings> = {
	fields: [
		{
			key: 'deckMultiplier',
			label: 'Deck multiplier',
			description: 'Number of standard Love Letter decks combined to support 6 players comfortably',
			type: 'number',
			defaultValue: 1,
			min: 1,
			max: 4,
			required: true,
		},
		{
			key: 'endOnFirstElimination',
			label: 'Sudden death',
			description: 'When enabled, game ends at first elimination (1 loser, all others winners)',
			type: 'boolean',
			defaultValue: true,
		},
		{
			key: 'revealEliminatedHand',
			label: 'Reveal eliminated hands',
			description: 'Show eliminated player hand to every player view',
			type: 'boolean',
			defaultValue: false,
		},
	],
	validate(settings) {
		const errors: string[] = [];
		const deckMultiplier = Number(settings.deckMultiplier ?? 1);
		if (!Number.isInteger(deckMultiplier) || deckMultiplier < 1 || deckMultiplier > 4) {
			errors.push('deckMultiplier must be an integer between 1 and 4');
		}
		return errors;
	},
};

export const loveLetterInfinityModule: GameModule<
	LoveLetterInfinityState,
	LoveLetterInfinityAction,
	LoveLetterInfinitySettings
> = {
	definition: {
		id: 'love-letter-infinity-gauntlet',
		displayName: 'Love Letter Infinity Gauntlet',
		description:
			'Love Letter variant for 2-6 players with hidden hands and one-loser-end condition (all other players win)',
		metadata: new LoveLetterInfinityEngine().metadata,
		playerConstraints: {
			minPlayers: 2,
			maxPlayers: 6,
		},
		settings: loveLetterInfinitySettingsDefinition,
		presentation: {
			playerView: 'hidden-hand-player-list',
		},
		capabilities: ['turn-based', 'hidden-information', 'spectator-mode', 'replay', 'async-play', 'live-play'],
		licensing: {
			distribution: 'open-source',
			license: 'MIT',
			sourceAvailable: true,
		},
		security: {
			maxActionPayloadBytes: 4096,
			allowUnknownSettings: false,
			allowSpectatorState: false,
		},
		actionDescriptors: [
			{
				actionType: LoveLetterInfinityActionTypes.DRAW_CARD,
				label: 'Draw card',
				description: 'Draw a card from the deck at the start of your turn',
			},
			{
				actionType: LoveLetterInfinityActionTypes.PLAY_CARD,
				label: 'Play card',
				description: 'Play one card and apply its effect',
				parameters: [
					{
						key: 'cardType',
						label: 'Card type',
						type: 'enum',
						required: true,
						options: Object.values(LoveLetterInfinityCardTypes).map((cardType) => ({
							value: cardType,
							label: cardType,
						})),
					},
					{
						key: 'targetPlayerId',
						label: 'Target player',
						type: 'string',
						required: false,
					},
					{
						key: 'guessedCard',
						label: 'Guessed card',
						type: 'enum',
						required: false,
						options: Object.values(LoveLetterInfinityCardTypes)
							.filter((cardType) => cardType !== LoveLetterInfinityCardTypes.GUARD)
							.map((cardType) => ({
								value: cardType,
								label: cardType,
							})),
					},
				],
			},
		],
	},
	createEngine() {
		return new LoveLetterInfinityEngine();
	},
};
