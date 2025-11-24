import type { Repository } from '#shared_kernel/domain/types/repository.interface'
import type { Result } from '#shared_kernel/domain/result'
import type { Game } from '../entities/game.entity.js'

export interface GameRepository extends Repository<Game> {
  findByLobbyId(lobbyId: string): Promise<Result<Game | null>>
  findActiveGames(): Promise<Result<Game[]>>
  findByPlayerId(playerId: string): Promise<Result<Game[]>>
}
