import type Lobby from '#domain/entities/lobby'
import { type LobbyStatus } from '#domain/value_objects/lobby_status'
import { type BaseRepository } from '#application/repositories/base_repository'

export interface LobbyRepository extends BaseRepository<Lobby> {
  findByCreator(creatorUuid: string): Promise<Lobby[]>
  findByStatus(status: LobbyStatus): Promise<Lobby[]>
  findAvailableLobbies(): Promise<Lobby[]> // OPEN, WAITING, READY
  findByPlayer(playerUuid: string): Promise<Lobby | null>

  // Méthodes spécifiques aux lobbies en mémoire
  findActiveLobbies(): Promise<Lobby[]>
  countActiveLobbies(): Promise<number>
}
