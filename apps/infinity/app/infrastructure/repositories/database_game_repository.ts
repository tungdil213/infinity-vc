import { inject } from '@adonisjs/core'
import { GameRepository } from '../../domain/repositories/game_repository.js'
import Game from '../../domain/entities/game.js'
import { GameStatus } from '../../domain/value_objects/game_status.js'
import GameModel from '../../models/game_model.js'
import { DateTime } from 'luxon'

@inject()
export class DatabaseGameRepository implements GameRepository {
  async save(game: Game): Promise<void> {
    const serialized = game.toJSON()

    await GameModel.updateOrCreate(
      { uuid: game.uuid },
      {
        uuid: game.uuid,
        status: serialized.status,
        players: serialized.players,
        gameData: serialized.gameData,
        winnerUuid: serialized.gameData.winner || null,
        startedAt: DateTime.fromJSDate(serialized.startedAt),
        finishedAt: serialized.finishedAt ? DateTime.fromJSDate(serialized.finishedAt) : null,
        durationMs: serialized.duration,
        isArchived: false,
      }
    )
  }

  async findByUuid(uuid: string): Promise<Game | null> {
    const model = await GameModel.query().where('uuid', uuid).where('deleted_at', false).first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findAll(): Promise<Game[]> {
    const models = await GameModel.query().where('deleted_at', false).orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    const models = await GameModel.query()
      .where('status', status)
      .where('deleted_at', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByPlayer(playerUuid: string): Promise<Game[]> {
    const models = await GameModel.query()
      .whereJsonSuperset('players', [{ uuid: playerUuid }])
      .where('deleted_at', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findActiveByPlayer(playerUuid: string): Promise<Game[]> {
    const models = await GameModel.query()
      .whereJsonSuperset('players', [{ uuid: playerUuid }])
      .whereIn('status', [GameStatus.IN_PROGRESS, GameStatus.PAUSED])
      .where('deleted_at', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async delete(uuid: string): Promise<void> {
    await GameModel.query().where('uuid', uuid).update({ deleted_at: true })
  }

  private toDomainEntity(model: GameModel): Game {
    return Game.reconstitute(
      model.uuid,
      model.status as GameStatus,
      model.players,
      model.gameData,
      model.startedAt.toJSDate(),
      model.finishedAt?.toJSDate()
    )
  }
}
