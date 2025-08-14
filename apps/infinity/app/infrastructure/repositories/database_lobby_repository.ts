import { inject } from '@adonisjs/core'
import type { LobbyRepository } from '../../domain/repositories/lobby_repository.js'
import Lobby from '../../domain/entities/lobby.js'
import Player from '../../domain/entities/player.js'
import LobbyModel from '../../models/lobby_model.js'

@inject()
export class DatabaseLobbyRepository implements LobbyRepository {
  async save(lobby: Lobby): Promise<void> {
    const serialized = lobby.serialize()
    
    await LobbyModel.updateOrCreate(
      { uuid: lobby.uuid },
      {
        uuid: lobby.uuid,
        name: serialized.name,
        maxPlayers: serialized.maxPlayers,
        isPrivate: serialized.isPrivate,
        status: serialized.status,
        createdBy: serialized.createdBy,
        players: serialized.players,
        availableActions: serialized.availableActions,
        isArchived: false,
      }
    )
  }

  async findByUuid(uuid: string): Promise<Lobby | null> {
    const model = await LobbyModel.query()
      .where('uuid', uuid)
      .where('is_archived', false)
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

    return models.map(model => this.toDomainEntity(model))
  }

  async findByStatus(status: string): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .where('status', status)
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map(model => this.toDomainEntity(model))
  }

  async findByCreator(creatorUuid: string): Promise<Lobby[]> {
    const models = await LobbyModel.query()
      .where('created_by', creatorUuid)
      .where('is_archived', false)
      .orderBy('created_at', 'desc')

    return models.map(model => this.toDomainEntity(model))
  }

  async delete(uuid: string): Promise<void> {
    await LobbyModel.query()
      .where('uuid', uuid)
      .update({ is_archived: true })
  }

  private toDomainEntity(model: LobbyModel): Lobby {
    const players = model.players.map((p: any) => new Player(p.uuid, p.nickName))
    
    return Lobby.reconstitute({
      uuid: model.uuid,
      name: model.name,
      maxPlayers: model.maxPlayers,
      isPrivate: model.isPrivate,
      status: model.status,
      createdBy: model.createdBy,
      players,
      availableActions: model.availableActions,
      createdAt: model.createdAt.toJSDate(),
    })
  }
}
