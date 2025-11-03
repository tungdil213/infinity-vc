/**
 * Point d'entrée principal du système de jeux
 * Initialise et enregistre tous les plugins de jeux disponibles
 */
import { getGamePluginRegistry } from './base/game_plugin_registry.js'
import { TicTacToePlugin } from './plugins/tic-tac-toe/index.js'

/**
 * Initialise tous les plugins de jeux
 */
export function initializeGamePlugins(): void {
  const registry = getGamePluginRegistry()

  // Enregistrer tous les plugins disponibles
  registry.register(new TicTacToePlugin())

  // Ajouter d'autres jeux ici au fur et à mesure
  // registry.register(new ChessPlugin())
  // registry.register(new PokerPlugin())

  console.log(`🎮 Initialized ${registry.getStats().totalGames} game plugins`)
}

// Export des éléments principaux
export { getGamePluginRegistry, GamePluginRegistry } from './base/game_plugin_registry.js'
export type {
  GamePlugin,
  GameConfig,
  GameValidationResult,
  GamePluginMetadata,
} from './base/game_plugin.js'
export { GameValidation } from './base/game_plugin.js'
