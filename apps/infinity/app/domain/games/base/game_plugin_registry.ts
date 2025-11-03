import type { GamePlugin, GamePluginMetadata } from './game_plugin.js'

/**
 * Registre global pour tous les plugins de jeux
 * Pattern Singleton pour gérer l'enregistrement des jeux disponibles
 */
export class GamePluginRegistry {
  private static instance: GamePluginRegistry | null = null
  private plugins = new Map<string, GamePlugin>()

  private constructor() {}

  static getInstance(): GamePluginRegistry {
    if (!GamePluginRegistry.instance) {
      GamePluginRegistry.instance = new GamePluginRegistry()
    }
    return GamePluginRegistry.instance
  }

  /**
   * Enregistrer un plugin de jeu
   */
  register(plugin: GamePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(
        `⚠️ GamePluginRegistry: Game plugin "${plugin.id}" already registered. Overwriting.`
      )
    }

    this.plugins.set(plugin.id, plugin)
    console.log(`✅ GamePluginRegistry: Registered game plugin "${plugin.name}" (${plugin.id})`)
  }

  /**
   * Enregistrer plusieurs plugins
   */
  registerMany(plugins: GamePlugin[]): void {
    plugins.forEach((plugin) => this.register(plugin))
  }

  /**
   * Désenregistrer un plugin
   */
  unregister(gameId: string): void {
    if (this.plugins.delete(gameId)) {
      console.log(`🗑️ GamePluginRegistry: Unregistered game plugin "${gameId}"`)
    }
  }

  /**
   * Obtenir un plugin par ID
   */
  getPlugin(gameId: string): GamePlugin | undefined {
    return this.plugins.get(gameId)
  }

  /**
   * Vérifier si un plugin existe
   */
  hasPlugin(gameId: string): boolean {
    return this.plugins.has(gameId)
  }

  /**
   * Obtenir tous les plugins enregistrés
   */
  getAllPlugins(): GamePlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Obtenir les métadonnées de tous les plugins
   */
  getAllMetadata(): GamePluginMetadata[] {
    return this.getAllPlugins().map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      minPlayers: plugin.minPlayers,
      maxPlayers: plugin.maxPlayers,
      estimatedDuration: plugin.estimatedDuration,
      tags: plugin.tags,
    }))
  }

  /**
   * Rechercher des jeux par tags
   */
  findByTags(tags: string[]): GamePlugin[] {
    return this.getAllPlugins().filter((plugin) => tags.some((tag) => plugin.tags.includes(tag)))
  }

  /**
   * Rechercher des jeux par nombre de joueurs
   */
  findByPlayerCount(playerCount: number): GamePlugin[] {
    return this.getAllPlugins().filter(
      (plugin) => playerCount >= plugin.minPlayers && playerCount <= plugin.maxPlayers
    )
  }

  /**
   * Réinitialiser le registre (utile pour les tests)
   */
  reset(): void {
    this.plugins.clear()
    console.log('🔄 GamePluginRegistry: Reset complete')
  }

  /**
   * Obtenir les statistiques du registre
   */
  getStats() {
    return {
      totalGames: this.plugins.size,
      games: Array.from(this.plugins.keys()),
    }
  }
}

/**
 * Helper pour obtenir l'instance du registre
 */
export function getGamePluginRegistry(): GamePluginRegistry {
  return GamePluginRegistry.getInstance()
}
