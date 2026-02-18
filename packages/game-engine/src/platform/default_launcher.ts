import { rockPaperScissorsModule } from '../games/rock-paper-scissors/rock_paper_scissors_module.js';
import { createGameLauncher, type GameLauncher } from './launcher.js';

export function createDefaultLauncher(): GameLauncher {
	return createGameLauncher([rockPaperScissorsModule]);
}

export const defaultLauncher = createDefaultLauncher();
