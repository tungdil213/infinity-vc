import type { GameCapability, GameDefinition } from '@infinity.dev/game-engine'

export interface GameCatalogQuery {
  includeProprietary?: boolean
  requiredCapabilities?: readonly GameCapability[]
}

export interface GameCatalogPort {
  findGameDefinition(gameId: string): GameDefinition<Record<string, unknown>> | null
  listGames(query?: GameCatalogQuery): GameDefinition<Record<string, unknown>>[]
}
