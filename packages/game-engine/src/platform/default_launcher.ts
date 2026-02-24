import { loveLetterInfinityModule } from '../games/love-letter-infinity-gauntlet/love_letter_infinity_module.js';
import { rockPaperScissorsModule } from '../games/rock-paper-scissors/rock_paper_scissors_module.js';
import { createGameLauncher, type GameLauncher } from './launcher.js';

export function createDefaultLauncher(): GameLauncher {
	return createGameLauncher([rockPaperScissorsModule, loveLetterInfinityModule]);
}

export const defaultLauncher = createDefaultLauncher();
