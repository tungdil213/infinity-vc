import type Lobby from '../../domain/entities/lobby.js'
import { type LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import { type BaseRepository } from './base_repository.js'

export interface LobbyRepository extends BaseRepository<Lobby> {
  findByCreator(creatorUuid: string): Promise<Lobby[]>
  findByStatus(status: LobbyStatus): Promise<Lobby[]>
  findAvailableLobbies(): Promise<Lobby[]> // OPEN, WAITING, READY
  findByPlayer(playerUuid: string): Promise<Lobby | null>

  // Méthodes spécifiques aux lobbies en mémoire
  findActiveLobbies(): Promise<Lobby[]>
  countActiveLobbies(): Promise<number>
}
