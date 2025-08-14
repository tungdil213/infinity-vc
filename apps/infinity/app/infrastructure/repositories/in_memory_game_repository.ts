import Game from '../../domain/entities/game.js'
import { GameStatus } from '../../domain/value_objects/game_status.js'
import { GameRepository } from '../../application/repositories/game_repository.js'
import { EntityNotFoundError } from '../../application/repositories/base_repository.js'

export class InMemoryGameRepository implements GameRepository {
  private games: Map<string, Game> = new Map()

  async findByUuid(uuid: string): Promise<Game | null> {
    return this.games.get(uuid) || null
  }

  async findByUuidOrFail(uuid: string): Promise<Game> {
    const game = await this.findByUuid(uuid)
    if (!game) {
      throw new EntityNotFoundError('Game', uuid)
    }
    return game
  }

  async findByPlayer(playerUuid: string): Promise<Game[]> {
    const result: Game[] = []
    for (const game of this.games.values()) {
      if (game.hasPlayer(playerUuid)) {
        result.push(game)
      }
    }

    // Trier par date de début (plus récents en premier)
    return result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    const result: Game[] = []
    for (const game of this.games.values()) {
      if (game.status === status) {
        result.push(game)
      }
    }
    return result
  }

  async findActiveGames(): Promise<Game[]> {
    const activeStatuses = [GameStatus.IN_PROGRESS, GameStatus.PAUSED]
    const result: Game[] = []

    for (const game of this.games.values()) {
      if (activeStatuses.includes(game.status)) {
        result.push(game)
      }
    }

    return result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  async findFinishedGames(): Promise<Game[]> {
    const result: Game[] = []
    for (const game of this.games.values()) {
      if (game.status === GameStatus.FINISHED) {
        result.push(game)
      }
    }

    return result.sort((a, b) => {
      const aFinished = a.finishedAt || new Date(0)
      const bFinished = b.finishedAt || new Date(0)
      return bFinished.getTime() - aFinished.getTime()
    })
  }

  async findRecentGames(limit: number = 10): Promise<Game[]> {
    const allGames = Array.from(this.games.values())

    // Trier par date de début (plus récents en premier)
    const sortedGames = allGames.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

    return sortedGames.slice(0, limit)
  }

  async countGamesByPlayer(playerUuid: string): Promise<number> {
    let count = 0
    for (const game of this.games.values()) {
      if (game.hasPlayer(playerUuid)) {
        count++
      }
    }
    return count
  }

  async countWinsByPlayer(playerUuid: string): Promise<number> {
    let wins = 0
    for (const game of this.games.values()) {
      if (game.status === GameStatus.FINISHED && game.hasPlayer(playerUuid)) {
        // Vérifier si ce joueur a gagné
        const gameData = game.gameData
        if (gameData.winner === playerUuid) {
          wins++
        }
      }
    }
    return wins
  }

  async save(game: Game): Promise<void> {
    this.games.set(game.uuid, game)
  }

  async delete(uuid: string): Promise<void> {
    this.games.delete(uuid)
  }

  async findAll(): Promise<Game[]> {
    return Array.from(this.games.values())
  }

  // Méthodes utilitaires pour les tests et le développement
  clear(): void {
    this.games.clear()
  }

  count(): number {
    return this.games.size
  }

  // Statistiques avancées
  async getPlayerStats(playerUuid: string): Promise<{
    gamesPlayed: number
    gamesWon: number
    winRate: number
    averageGameDuration: number
  }> {
    const playerGames = await this.findByPlayer(playerUuid)
    const finishedGames = playerGames.filter((g) => g.status === GameStatus.FINISHED)

    const gamesPlayed = finishedGames.length
    const gamesWon = await this.countWinsByPlayer(playerUuid)
    const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0

    const totalDuration = finishedGames.reduce((sum, game) => sum + game.duration, 0)
    const averageGameDuration = gamesPlayed > 0 ? totalDuration / gamesPlayed : 0

    return {
      gamesPlayed,
      gamesWon,
      winRate,
      averageGameDuration,
    }
  }

  // Nettoyage automatique des parties archivées
  async cleanupArchivedGames(): Promise<number> {
    let cleanedCount = 0
    const toDelete: string[] = []

    for (const [uuid, game] of this.games.entries()) {
      if (game.status === GameStatus.ARCHIVED) {
        // Supprimer les parties archivées après 30 jours
        const timeSinceFinished = game.finishedAt ? Date.now() - game.finishedAt.getTime() : 0
        if (timeSinceFinished > 30 * 24 * 60 * 60 * 1000) {
          // 30 jours
          toDelete.push(uuid)
        }
      }
    }

    for (const uuid of toDelete) {
      this.games.delete(uuid)
      cleanedCount++
    }

    return cleanedCount
  }
}
