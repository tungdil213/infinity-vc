import type Player from '#domain/entities/player'
import { type PlayerInterface } from '#domain/interfaces/player_interface'
import { type BaseRepository } from '#application/repositories/base_repository'

export interface PlayerRepository extends BaseRepository<Player> {
  findByUserUuid(userUuid: string): Promise<Player | null>
  findByUserUuidOrFail(userUuid: string): Promise<Player>
  findByNickName(nickName: string): Promise<Player | null>
  existsByNickName(nickName: string): Promise<boolean>

  // Méthodes utilitaires pour les interfaces
  findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null>
  findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface>
}
