import { inject } from '@adonisjs/core'
import type { LobbyRepository } from '../../application/repositories/lobby_repository.js'
import Lobby from '../../domain/entities/lobby.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.js'
import LobbyModel from '../../models/lobby_model.js'

@inject()
export class DatabaseLobbyRepository implements LobbyRepository {
  async save(lobby: Lobby): Promise<void> {
    await LobbyModel.updateOrCreate(
      { uuid: lobby.uuid },
      {
        uuid: lobby.uuid,
        name: lobby.name,
        maxPlayers: lobby.maxPlayers,
        isPrivate: lobby.isPrivate,
        status: lobby.status,
        createdBy: lobby.createdBy,
        players: lobby.players,
        availableActions: lobby.availableActions,
        isArchived: false,
      }
    )
  }

  async findByUuid(uuid: string): Promise<Lobby | null> {
    const model = await LobbyModel.query().where('uuid', uuid).where('is_archived', false).first()

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
    const knex = LobbyModel.query().knexQuery
    const dbClient = knex.client.config.client

    let models: any[]

    if (dbClient === 'pg') {
      // PostgreSQL: utilise jsonb_path_exists ou @>
      models = await LobbyModel.query()
        .where('is_archived', false)
        .whereRaw('players @> ?', [JSON.stringify([{ uuid: playerUuid }])])
    } else if (dbClient === 'mysql2' || dbClient === 'mysql') {
      // MySQL/MariaDB: utilise JSON_SEARCH
      models = await LobbyModel.query()
        .where('is_archived', false)
        .whereRaw('JSON_SEARCH(players, "one", ?) IS NOT NULL', [playerUuid])
    } else {
      // SQLite: utilise json_extract
      models = await LobbyModel.query()
        .where('is_archived', false)
        .whereRaw('json_extract(players, "$[*].uuid") LIKE ?', [`%${playerUuid}%`])
    }

    if (models.length === 0) {
      return null
    }

    return this.toDomainEntity(models[0])
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
    const players = model.players.map((p: any) => ({
      uuid: p.uuid,
      nickName: p.nickName,
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
