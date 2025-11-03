import type { ApplicationService } from '@adonisjs/core/types'
import { initializeGamePlugins } from '#domain/games/index'

/**
 * Provider pour initialiser automatiquement les plugins de jeux
 */
export default class GamePluginProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * S'exécute au démarrage de l'application
   */
  async boot() {
    // Initialiser tous les plugins de jeux disponibles
    initializeGamePlugins()
  }
}
