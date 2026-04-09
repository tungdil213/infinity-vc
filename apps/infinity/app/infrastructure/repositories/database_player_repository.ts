import Player from '#domain/entities/player'
import { type PlayerInterface } from '#domain/interfaces/player_interface'
import { type PlayerRepository } from '#application/repositories/player_repository'
import { EntityNotFoundException } from '#exceptions/domain_exceptions'
import User from '#models/user'
import PlayerModel from '#models/player'

export class DatabasePlayerRepository implements PlayerRepository {
  async save(player: Player): Promise<void> {
    const serialized = player.toJSON()

    // Check if player exists
    const existingPlayer = await PlayerModel.query().where('player_uuid', serialized.uuid).first()

    if (existingPlayer) {
      // Update existing player
      existingPlayer.merge({
        nickName: serialized.nickName,
      })
      await existingPlayer.save()
    } else {
      // Create new player
      await PlayerModel.create({
        playerUuid: serialized.uuid,
        userUuid: serialized.userUuid,
        nickName: serialized.nickName,
      })
    }
  }

  async findByUuid(uuid: string): Promise<Player | null> {
    const model = await PlayerModel.query()
      .where('player_uuid', uuid)
      .whereNull('deleted_at')
      .first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findByUserUuid(userUuid: string): Promise<Player | null> {
    const model = await PlayerModel.query()
      .where('user_uuid', userUuid)
      .whereNull('deleted_at')
      .first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findByUserUuidOrFail(userUuid: string): Promise<Player> {
    const player = await this.findByUserUuid(userUuid)
    if (!player) {
      throw new EntityNotFoundException('Player', userUuid)
    }
    return player
  }

  async findByNickName(nickName: string): Promise<Player | null> {
    const normalizedNickName = nickName.trim().toLowerCase()
    const model = await PlayerModel.query()
      .whereRaw('LOWER(nick_name) = ?', [normalizedNickName])
      .whereNull('deleted_at')
      .first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async existsByNickName(nickName: string): Promise<boolean> {
    const player = await this.findByNickName(nickName)
    return player !== null
  }

  async delete(uuid: string): Promise<void> {
    const model = await PlayerModel.query()
      .whereNull('deleted_at')
      .where((query) => {
        query.where('player_uuid', uuid).orWhere('user_uuid', uuid)
      })
      .first()

    if (!model) {
      return
    }

    await model.softDelete()
  }

  async findByUuidOrFail(uuid: string): Promise<Player> {
    const player = await this.findByUuid(uuid)
    if (!player) {
      throw new EntityNotFoundException('Player', uuid)
    }
    return player
  }

  async findAll(): Promise<Player[]> {
    const models = await PlayerModel.query().whereNull('deleted_at').orderBy('created_at', 'desc')
    return models.map((model) => this.toDomainEntity(model))
  }

  async findPlayerInterfaceByUuid(userUuid: string): Promise<PlayerInterface | null> {
    const user = await User.query().where('userUuid', userUuid).first()
    if (!user) {
      return null
    }

    return {
      uuid: user.userUuid,
      nickName: user.fullName || 'Unknown Player',
    }
  }

  async findPlayerInterfaceByUuidOrFail(userUuid: string): Promise<PlayerInterface> {
    const playerInterface = await this.findPlayerInterfaceByUuid(userUuid)
    if (!playerInterface) {
      throw new EntityNotFoundException('PlayerInterface', userUuid)
    }
    return playerInterface
  }

  private toDomainEntity(model: PlayerModel): Player {
    return Player.reconstitute(
      model.playerUuid,
      model.userUuid,
      model.nickName,
      0,
      0,
      model.createdAt.toJSDate()
    )
  }
}
