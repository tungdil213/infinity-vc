import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Provider pour initialiser automatiquement les plugins de jeux DDD
 *
 * TODO: Réactiver après configuration correcte des paths aliases
 */
export default class GamePluginProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * S'exécute au démarrage de l'application
   */
  async boot() {
    // Temporairement désactivé pendant configuration paths
    // Les plugins seront chargés dynamiquement depuis les controllers

    console.log('⚠️  Game Plugins: Temporairement désactivés (configuration paths en cours)')
  }
}
