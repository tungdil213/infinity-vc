import type Game from '#domain/entities/game'
import { type GameStatus } from '#domain/value_objects/game_status'
import { type BaseRepository } from '#application/repositories/base_repository'

export interface GameRepository extends BaseRepository<Game> {
  findByPlayer(playerUuid: string): Promise<Game[]>
  findByStatus(status: GameStatus): Promise<Game[]>
  findActiveGames(): Promise<Game[]> // IN_PROGRESS, PAUSED
  findFinishedGames(): Promise<Game[]> // FINISHED, ABANDONED
  findRecentGames(limit?: number): Promise<Game[]>

  // Statistiques
  countGamesByPlayer(playerUuid: string): Promise<number>
  countWinsByPlayer(playerUuid: string): Promise<number>
}
