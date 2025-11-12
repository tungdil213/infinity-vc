import { Result } from '#shared_kernel/domain/result'
import type { GameRepository } from '../../domain/repositories/game_repository.interface.js'
import type { Game } from '../../domain/entities/game.entity.js'
import { Game as GameEntity } from '../../domain/entities/game.entity.js'
import { GameState } from '../../domain/value_objects/game_state.vo.js'
import { GameStatus } from '../../domain/value_objects/game_status.vo.js'
import GameModel from './game.model.js'

export class GameRepositoryLucid implements GameRepository {
  async findById(id: string): Promise<Result<Game | null>> {
    try {
      const model = await GameModel.find(id)

      if (!model) {
        return Result.ok(null)
      }

      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find game: ${error.message}`)
    }
  }

  async findByLobbyId(lobbyId: string): Promise<Result<Game | null>> {
    try {
      const model = await GameModel.query().where('lobbyId', lobbyId).first()

      if (!model) {
        return Result.ok(null)
      }

      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find game by lobby: ${error.message}`)
    }
  }

  async findActiveGames(): Promise<Result<Game[]>> {
    try {
      const models = await GameModel.query()
        .whereIn('status', [GameStatus.IN_PROGRESS, GameStatus.PAUSED])
        .orderBy('createdAt', 'desc')

      const games: Game[] = []
      for (const model of models) {
        const result = await this.toDomain(model)
        if (result.isSuccess && result.value) {
          games.push(result.value)
        }
      }

      return Result.ok(games)
    } catch (error) {
      return Result.fail(`Failed to find active games: ${error.message}`)
    }
  }

  async findByPlayerId(playerId: string): Promise<Result<Game[]>> {
    try {
      const models = await GameModel.query().orderBy('createdAt', 'desc')

      const games: Game[] = []
      for (const model of models) {
        if (model.playerIds.includes(playerId)) {
          const result = await this.toDomain(model)
          if (result.isSuccess && result.value) {
            games.push(result.value)
          }
        }
      }

      return Result.ok(games)
    } catch (error) {
      return Result.fail(`Failed to find games by player: ${error.message}`)
    }
  }

  async save(game: Game): Promise<Result<Game>> {
    try {
      let model = await GameModel.find(game.id)

      if (!model) {
        model = new GameModel()
        model.id = game.id
      }

      model.lobbyId = game.lobbyId
      model.gameType = game.gameType
      model.playerIds = game.playerIds
      model.state = {
        data: game.state.data,
        currentPlayerIndex: game.state.currentPlayerIndex,
        turnNumber: game.state.turnNumber,
      }
      model.status = game.status
      model.winnerId = game.winnerId ?? null

      await model.save()

      return Result.ok(game)
    } catch (error) {
      return Result.fail(`Failed to save game: ${error.message}`)
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await GameModel.query().where('id', id).delete()
      return Result.ok()
    } catch (error) {
      return Result.fail(`Failed to delete game: ${error.message}`)
    }
  }

  private async toDomain(model: GameModel): Promise<Result<Game>> {
    const stateResult = GameState.create({
      data: model.state.data,
      currentPlayerIndex: model.state.currentPlayerIndex,
      turnNumber: model.state.turnNumber,
    })

    if (stateResult.isFailure) {
      return Result.fail(stateResult.error)
    }

    const gameResult = GameEntity.create(
      {
        lobbyId: model.lobbyId,
        gameType: model.gameType,
        playerIds: model.playerIds,
        state: stateResult.value,
      },
      model.id
    )

    return gameResult
  }
}
