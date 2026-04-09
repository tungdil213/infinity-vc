import type { Lobby } from '@infinity.dev/lobby-domain/entities'
import { type LobbyStatus } from '@infinity.dev/lobby-domain/value-objects'
import { type BaseRepository } from './base_repository.js'

export interface LobbyRepository extends BaseRepository<Lobby> {
  findByCreator(creatorUuid: string): Promise<Lobby[]>
  findByStatus(status: LobbyStatus): Promise<Lobby[]>
  findAvailableLobbies(): Promise<Lobby[]>
  findByPlayer(playerUuid: string): Promise<Lobby | null>

  findActiveLobbies(): Promise<Lobby[]>
  countActiveLobbies(): Promise<number>
}
