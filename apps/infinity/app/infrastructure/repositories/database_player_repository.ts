import { PlayerRepository } from '#application/repositories/player_repository'
import Player from '#domain/entities/player'

export class DatabasePlayerRepository implements PlayerRepository {
  async save(player: Player): Promise<void> {
    // TODO: Implement database save
    console.log('Saving player:', player.uuid)
  }

  async findByUuid(uuid: string): Promise<Player | null> {
    // TODO: Implement database find
    console.log('Finding player by uuid:', uuid)
    return null
  }

  async findByUserUuid(userUuid: string): Promise<Player | null> {
    // TODO: Implement database find by user uuid
    console.log('Finding player by user uuid:', userUuid)
    return null
  }

  async findByUserUuidOrFail(userUuid: string): Promise<Player> {
    const player = await this.findByUserUuid(userUuid)
    if (!player) {
      throw new Error(`Player not found for user: ${userUuid}`)
    }
    return player
  }

  async findByNickName(nickName: string): Promise<Player | null> {
    // TODO: Implement database find by nickname
    console.log('Finding player by nickname:', nickName)
    return null
  }

  async existsByNickName(nickName: string): Promise<boolean> {
    const player = await this.findByNickName(nickName)
    return player !== null
  }

  async delete(uuid: string): Promise<void> {
    // TODO: Implement database delete
    console.log('Deleting player:', uuid)
  }
}
