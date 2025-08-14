import Game from '../../domain/entities/game.js'
import { GameStatus } from '../../domain/value_objects/game_status.js'
import { BaseRepository } from './base_repository.js'

export interface GameRepository extends BaseRepository<Game> {
  findByPlayer(playerUuid: string): Promise<Game[]>
  findByStatus(status: GameStatus): Promise<Game[]>
  findActiveGames(): Promise<Game[]> // IN_PROGRESS, PAUSED
  findFinishedGames(): Promise<Game[]>
  findRecentGames(limit?: number): Promise<Game[]>

  // Statistiques
  countGamesByPlayer(playerUuid: string): Promise<number>
  countWinsByPlayer(playerUuid: string): Promise<number>
}
