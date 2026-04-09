export interface GameCatalogQuery {
  includeProprietary?: boolean
  requiredCapabilities?: readonly string[]
}

export interface GameDefinition {
  readonly gameId?: string
  readonly id?: string
  readonly playerConstraints: {
    readonly minPlayers: number
    readonly maxPlayers: number
  }
}

export interface GameCatalogPort {
  findGameDefinition(gameId: string): GameDefinition | null
  listGames(query?: GameCatalogQuery): GameDefinition[]
}
