import type Player from '../../domain/entities/player.js'
import { type PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { type BaseRepository } from './base_repository.js'

export interface PlayerRepository extends BaseRepository<Player> {
  findByUserUuid(userUuid: string): Promise<Player | null>
  findByUserUuidOrFail(userUuid: string): Promise<Player>
  findByNickName(nickName: string): Promise<Player | null>
  existsByNickName(nickName: string): Promise<boolean>

  // Méthodes utilitaires pour les interfaces
  findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null>
  findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface>
}
