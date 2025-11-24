import type { GamePlugin } from './game_plugin.interface.js'
import { Result } from '#shared_kernel/domain/result'

/**
 * Game Plugin Registry
 * Singleton pour gérer les plugins de jeu
 */
export class GamePluginRegistry {
  private static instance: GamePluginRegistry
  private plugins: Map<string, GamePlugin> = new Map()

  private constructor() {}

  public static getInstance(): GamePluginRegistry {
    if (!GamePluginRegistry.instance) {
      GamePluginRegistry.instance = new GamePluginRegistry()
    }
    return GamePluginRegistry.instance
  }

  public register(plugin: GamePlugin): Result<void> {
    if (this.plugins.has(plugin.name)) {
      return Result.fail(`Plugin ${plugin.name} already registered`)
    }

    this.plugins.set(plugin.name, plugin)
    return Result.ok()
  }

  public getPlugin(name: string): Result<GamePlugin> {
    const plugin = this.plugins.get(name)

    if (!plugin) {
      return Result.fail(`Plugin ${name} not found`)
    }

    return Result.ok(plugin)
  }

  public getAllPlugins(): GamePlugin[] {
    return Array.from(this.plugins.values())
  }

  public unregister(name: string): Result<void> {
    if (!this.plugins.has(name)) {
      return Result.fail(`Plugin ${name} not found`)
    }

    this.plugins.delete(name)
    return Result.ok()
  }
}
