import { type GameDefinition, type GameLauncher } from '@infinity.dev/game-engine'
import type { GameCatalogPort, GameCatalogQuery } from '#application/services/game_catalog_port'
import { getAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'

export class LauncherGameCatalog implements GameCatalogPort {
  constructor(private readonly launcher: GameLauncher = getAppGameLauncher()) {}

  findGameDefinition(gameId: string): GameDefinition<Record<string, unknown>> | null {
    return this.launcher.getGameDefinition(gameId)
  }

  listGames(query: GameCatalogQuery = {}): GameDefinition<Record<string, unknown>>[] {
    const includeProprietary = query.includeProprietary ?? true
    const requiredCapabilities = query.requiredCapabilities ?? []

    return this.launcher.listGames().filter((definition) => {
      const distribution = definition.licensing?.distribution ?? 'open-source'
      if (!includeProprietary && distribution === 'proprietary') {
        return false
      }

      const capabilities = definition.capabilities ?? ['turn-based']
      return requiredCapabilities.every((requiredCapability) =>
        capabilities.includes(requiredCapability)
      )
    })
  }
}

export const defaultGameCatalog = new LauncherGameCatalog()
