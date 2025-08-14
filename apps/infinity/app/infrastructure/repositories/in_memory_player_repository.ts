import Player from '../../domain/entities/player.js'
import { PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { PlayerRepository } from '../../application/repositories/player_repository.js'
import { EntityNotFoundError } from '../../application/repositories/base_repository.js'

export class InMemoryPlayerRepository implements PlayerRepository {
  private players: Map<string, Player> = new Map()

  async findByUuid(uuid: string): Promise<Player | null> {
    return this.players.get(uuid) || null
  }

  async findByUuidOrFail(uuid: string): Promise<Player> {
    const player = await this.findByUuid(uuid)
    if (!player) {
      throw new EntityNotFoundError('Player', uuid)
    }
    return player
  }

  async findByUserUuid(userUuid: string): Promise<Player | null> {
    return this.players.get(userUuid) || null
  }

  async findByUserUuidOrFail(userUuid: string): Promise<Player> {
    const player = await this.findByUserUuid(userUuid)
    if (!player) {
      throw new EntityNotFoundError('Player', userUuid)
    }
    return player
  }

  async findByNickName(nickName: string): Promise<Player | null> {
    for (const player of this.players.values()) {
      if (player.nickName.toLowerCase() === nickName.toLowerCase()) {
        return player
      }
    }
    return null
  }

  async existsByNickName(nickName: string): Promise<boolean> {
    const player = await this.findByNickName(nickName)
    return player !== null
  }

  async findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null> {
    const player = await this.findByUserUuid(userUuid)
    return player ? player.toPlayerInterface() : null
  }

  async findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface> {
    const player = await this.findByUserUuidOrFail(userUuid)
    return player.toPlayerInterface()
  }

  async save(player: Player): Promise<void> {
    this.players.set(player.userUuid, player)
  }

  async delete(uuid: string): Promise<void> {
    this.players.delete(uuid)
  }

  async findAll(): Promise<Player[]> {
    return Array.from(this.players.values())
  }

  // Méthodes utilitaires pour les tests
  clear(): void {
    this.players.clear()
  }

  count(): number {
    return this.players.size
  }
}
