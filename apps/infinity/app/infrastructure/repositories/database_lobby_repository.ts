import { inject } from '@adonisjs/core'
import type { LobbyRepository } from '../../application/repositories/lobby_repository.js'
import Lobby from '../../domain/entities/lobby.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import LobbyModel from '../../models/lobby_model.js'
import User from '../../models/user.js'

@inject()
export class DatabaseLobbyRepository implements LobbyRepository {
  async save(lobby: Lobby): Promise<void> {
    const lobbyModel = await LobbyModel.updateOrCreate(
      { uuid: lobby.uuid },
      {
        uuid: lobby.uuid,
        name: lobby.name,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        status: lobby.status,
        createdBy: lobby.createdBy,
        availableActions: lobby.availableActions,
        isArchived: false,
      }
    )

    // Gérer les relations players via la table pivot
    const playerUuids = lobby.players.map((p) => p.uuid)

    // Récupérer les IDs des utilisateurs à partir de leurs UUIDs
    const users = await User.query().whereIn('user_uuid', playerUuids)
    const userIds = users.map((user) => user.id)

    if (users.length !== playerUuids.length) {
      const foundUuids = users.map((u) => u.userUuid)
      const missingUuids = playerUuids.filter((uuid) => !foundUuids.includes(uuid))
      throw new Error(`Users not found: ${missingUuids.join(', ')}`)
    }

    // Créer les données pivot avec les IDs
    const pivotData = userIds.reduce(
      (acc, userId) => {
        acc[userId] = {
          uuid: crypto.randomUUID(),
          joined_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }
        return acc
      },
      {} as Record<string, any>
    )

    await lobbyModel.related('players').sync(pivotData)
  }

  async findByUuid(uuid: string): Promise<Lobby | null> {
    const model = await LobbyModel.query()
      .where('uuid', uuid)
      .where('is_archived', false)
      .preload('players')
      .first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findAll(): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByStatus(status: LobbyStatus): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .where('status', status)
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByCreator(creatorUuid: string): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .where('created_by', creatorUuid)
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async delete(uuid: string): Promise<void> {
    await LobbyModel.query().where('uuid', uuid).update({ is_archived: true })
  }

  async findByUuidOrFail(uuid: string): Promise<Lobby> {
    const lobby = await this.findByUuid(uuid)
    if (!lobby) {
      throw new Error(`Lobby not found: ${uuid}`)
    }
    return lobby
  }

  async findAvailableLobbies(): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .whereIn('status', ['OPEN', 'WAITING', 'READY'])
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByPlayer(playerUuid: string): Promise<Lobby | null> {
    const model = await LobbyModel.query()
      .where('is_archived', false)
      .whereHas('players', (query) => {
        query.where('user_uuid', playerUuid)
      })
      .first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findActiveLobbies(): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .whereIn('status', ['OPEN', 'WAITING', 'READY', 'IN_PROGRESS'])
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async countActiveLobbies(): Promise<number> {
    const result = await LobbyModel.query()
      .whereIn('status', ['OPEN', 'WAITING', 'READY', 'IN_PROGRESS'])
      .where('is_archived', false)
      .count('* as total')

    return Number(result[0].$extras.total)
  }

  private toDomainEntity(model: LobbyModel): Lobby {
    const players = model.players.map((user: any) => ({
      uuid: user.userUuid,
      nickName: user.fullName,
    }))

    return Lobby.reconstitute(
      model.uuid,
      model.name,
      model.createdBy,
      players,
      model.maxPlayers,
      model.isPrivate,
      model.createdAt.toJSDate()
    )
  }
}
