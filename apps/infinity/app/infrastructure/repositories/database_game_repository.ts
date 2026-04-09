import { inject } from '@adonisjs/core'
import { GameRepository } from '#application/repositories/game_repository'
import { EntityNotFoundError } from '#application/repositories/base_repository'
import Game from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import GameModel from '#models/game_model'
import { DateTime } from 'luxon'
import env from '#start/env'

@inject()
export class DatabaseGameRepository implements GameRepository {
  async findByUuidOrFail(uuid: string): Promise<Game> {
    const game = await this.findByUuid(uuid)
    if (!game) {
      throw new EntityNotFoundError('Game', uuid)
    }
    return game
  }

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
    const model = await GameModel.query().where('uuid', uuid).where('is_archived', false).first()

    if (!model) {
      return null
    }

    return this.toDomainEntity(model)
  }

  async findAll(): Promise<Game[]> {
    const models = await GameModel.query().where('is_archived', false).orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    const models = await GameModel.query()
      .where('status', status)
      .where('is_archived', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findByPlayer(playerUuid: string): Promise<Game[]> {
    const query = GameModel.query().where('is_archived', false).orderBy('started_at', 'desc')
    this.applyPlayerFilter(query, playerUuid)
    const models = await query

    return models.map((model) => this.toDomainEntity(model))
  }

  async findActiveByPlayer(playerUuid: string): Promise<Game[]> {
    const query = GameModel.query()
      .whereIn('status', [GameStatus.IN_PROGRESS, GameStatus.PAUSED])
      .where('is_archived', false)
      .orderBy('started_at', 'desc')
    this.applyPlayerFilter(query, playerUuid)
    const models = await query

    return models.map((model) => this.toDomainEntity(model))
  }

  async delete(uuid: string): Promise<void> {
    await GameModel.query().where('uuid', uuid).update({ is_archived: true })
  }

  async findActiveGames(): Promise<Game[]> {
    const models = await GameModel.query()
      .whereIn('status', [GameStatus.IN_PROGRESS, GameStatus.PAUSED])
      .where('is_archived', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findFinishedGames(): Promise<Game[]> {
    const models = await GameModel.query()
      .whereIn('status', [GameStatus.FINISHED, GameStatus.ABANDONED])
      .where('is_archived', false)
      .orderBy('started_at', 'desc')

    return models.map((model) => this.toDomainEntity(model))
  }

  async findRecentGames(limit: number = 10): Promise<Game[]> {
    const models = await GameModel.query()
      .where('is_archived', false)
      .orderBy('started_at', 'desc')
      .limit(limit)

    return models.map((model) => this.toDomainEntity(model))
  }

  async countGamesByPlayer(playerUuid: string): Promise<number> {
    const query = GameModel.query().where('is_archived', false).count('* as total')
    this.applyPlayerFilter(query, playerUuid)
    const result = await query

    return Number((result[0] as any)?.total ?? 0)
  }

  async countWinsByPlayer(playerUuid: string): Promise<number> {
    const result = await GameModel.query()
      .where('winner_uuid', playerUuid)
      .where('is_archived', false)
      .count('* as total')

    return Number((result[0] as any)?.total ?? 0)
  }

  private applyPlayerFilter(query: ReturnType<typeof GameModel.query>, playerUuid: string) {
    if (env.get('DB_CONNECTION') === 'sqlite') {
      const playersColumn = `"${GameModel.table}"."players"`
      query.whereRaw(
        `
          EXISTS (
            SELECT 1
            FROM json_each(${playersColumn}) AS player_entry
            WHERE json_extract(player_entry.value, '$.uuid') = ?
          )
        `,
        [playerUuid]
      )
      return
    }

    query.whereJsonSuperset('players', [{ uuid: playerUuid }])
  }

  private toDomainEntity(model: GameModel): Game {
    // Ensure players and gameData are proper objects/arrays (they are stored as JSON strings)
    let players: any = model.players as any
    let gameData: any = model.gameData as any

    if (typeof players === 'string') {
      try {
        const parsed = JSON.parse(players)
        players = Array.isArray(parsed) ? parsed : Object.values(parsed)
      } catch {
        players = []
      }
    }

    if (typeof gameData === 'string') {
      try {
        gameData = JSON.parse(gameData)
      } catch {
        gameData = {}
      }
    }

    return Game.reconstitute(
      model.uuid,
      model.status as GameStatus,
      players,
      gameData,
      model.startedAt.toJSDate(),
      model.finishedAt?.toJSDate()
    )
  }
}
