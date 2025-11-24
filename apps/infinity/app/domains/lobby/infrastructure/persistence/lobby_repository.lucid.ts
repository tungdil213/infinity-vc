import { Result } from '#shared_kernel/domain/result'
import type { LobbyRepository } from '../../domain/repositories/lobby_repository.interface.js'
import type { LobbyAggregate } from '../../domain/aggregates/lobby.aggregate.js'
import { LobbyAggregate as LobbyAgg } from '../../domain/aggregates/lobby.aggregate.js'
import { Lobby } from '../../domain/entities/lobby.entity.js'
import { Player } from '../../domain/entities/player.entity.js'
import { LobbySettings } from '../../domain/value_objects/lobby_settings.vo.js'
import { LobbyStatus } from '../../domain/value_objects/lobby_status.vo.js'
import LobbyModel from './lobby.model.js'
import PlayerModel from './player.model.js'
import UserModel from '#domains/iam/infrastructure/persistence/user.model'

export class LobbyRepositoryLucid implements LobbyRepository {
  async findById(id: string): Promise<Result<LobbyAggregate | null>> {
    try {
      // id is UUID in domain layer
      const model = await LobbyModel.query().where('uuid', id).preload('players').first()

      if (!model) {
        return Result.ok(null)
      }

      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find lobby: ${error.message}`)
    }
  }

  async findAll(): Promise<Result<LobbyAggregate[]>> {
    try {
      const models = await LobbyModel.query().preload('players').orderBy('createdAt', 'desc')

      const aggregates: LobbyAggregate[] = []
      for (const model of models) {
        const result = await this.toDomain(model)
        if (result.isSuccess && result.value) {
          aggregates.push(result.value)
        }
      }

      return Result.ok(aggregates)
    } catch (error) {
      return Result.fail(`Failed to find lobbies: ${error.message}`)
    }
  }

  async findByOwnerId(ownerId: number): Promise<Result<LobbyAggregate[]>> {
    try {
      const models = await LobbyModel.query()
        .where('ownerId', ownerId)
        .preload('players')
        .orderBy('createdAt', 'desc')

      const aggregates: LobbyAggregate[] = []
      for (const model of models) {
        const result = await this.toDomain(model)
        if (result.isSuccess && result.value) {
          aggregates.push(result.value)
        }
      }

      return Result.ok(aggregates)
    } catch (error) {
      return Result.fail(`Failed to find lobbies by owner: ${error.message}`)
    }
  }

  async findAvailable(): Promise<Result<LobbyAggregate[]>> {
    try {
      const models = await LobbyModel.query()
        .whereIn('status', [LobbyStatus.WAITING, LobbyStatus.READY])
        .where('isPrivate', false)
        .preload('players')
        .orderBy('createdAt', 'desc')

      const aggregates: LobbyAggregate[] = []
      for (const model of models) {
        const result = await this.toDomain(model)
        if (result.isSuccess && result.value) {
          aggregates.push(result.value)
        }
      }

      return Result.ok(aggregates)
    } catch (error) {
      return Result.fail(`Failed to find available lobbies: ${error.message}`)
    }
  }

  async save(aggregate: LobbyAggregate): Promise<Result<LobbyAggregate>> {
    try {
      const lobby = aggregate.lobbyEntity

      // Find user by UUID to get integer ID
      const owner = await UserModel.findBy('userUuid', lobby.ownerId)
      if (!owner) {
        return Result.fail(`Owner with UUID ${lobby.ownerId} not found`)
      }

      // Try to find existing lobby by UUID
      let model = await LobbyModel.findBy('uuid', lobby.id)

      if (!model) {
        model = new LobbyModel()
        // Don't set id (autoincrement)
        model.uuid = lobby.id
      }

      model.ownerId = owner.id // Use integer ID
      model.name = lobby.settings.name
      model.maxPlayers = lobby.settings.maxPlayers
      model.minPlayers = lobby.settings.minPlayers
      model.isPrivate = lobby.settings.isPrivate
      model.gameType = lobby.settings.gameType
      model.status = lobby.status
      model.invitationCode = lobby.invitationCode || null
      model.gameId = lobby.gameId || null

      await model.save()

      // Load existing players
      await model.load('players')

      const newPlayers = aggregate.playersList
      const newPlayerUserIds = new Set<string>()

      // 1. Add/Update players from aggregate
      for (const player of newPlayers) {
        // Find user by UUID to get integer ID
        const playerUser = await UserModel.findBy('userUuid', player.userId)
        if (!playerUser) {
          return Result.fail(`Player user with UUID ${player.userId} not found`)
        }

        newPlayerUserIds.add(player.userId)

        // Check if player already exists
        let playerModel = await PlayerModel.query()
          .where('lobby_id', model.id)
          .where('user_id', playerUser.id)
          .first()

        if (!playerModel) {
          playerModel = new PlayerModel()
          // Don't set id (autoincrement)
        }

        playerModel.userId = playerUser.id // Integer ID
        playerModel.username = player.username
        playerModel.lobbyId = model.id
        playerModel.isReady = player.isReady
        playerModel.isOwner = player.isOwner

        await playerModel.save()
      }

      // 2. Delete players that are no longer in the aggregate (left the lobby)
      const existingPlayers = await PlayerModel.query().where('lobby_id', model.id)

      for (const existingPlayer of existingPlayers) {
        const user = await UserModel.find(existingPlayer.userId)
        if (!user) continue

        // If this player is not in the aggregate anymore, delete them
        if (!newPlayerUserIds.has(user.userUuid)) {
          await existingPlayer.delete()
        }
      }

      return Result.ok(aggregate)
    } catch (error) {
      return Result.fail(`Failed to save lobby: ${error.message}`)
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await PlayerModel.query().where('lobbyId', id).delete()
      await LobbyModel.query().where('id', id).delete()
      return Result.ok()
    } catch (error) {
      return Result.fail(`Failed to delete lobby: ${error.message}`)
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const model = await LobbyModel.query().where('uuid', id).first()
      return !!model
    } catch (error) {
      return false
    }
  }

  async findByInvitationCode(code: string): Promise<Result<LobbyAggregate | null>> {
    try {
      const model = await LobbyModel.query()
        .where('invitation_code', code)
        .preload('players')
        .first()

      if (!model) {
        return Result.ok(null)
      }

      return this.toDomain(model)
    } catch (error) {
      return Result.fail(`Failed to find lobby by invitation code: ${error.message}`)
    }
  }

  private async toDomain(model: LobbyModel): Promise<Result<LobbyAggregate>> {
    // Create settings
    const settingsResult = LobbySettings.create({
      name: model.name,
      maxPlayers: model.maxPlayers,
      minPlayers: model.minPlayers,
      isPrivate: model.isPrivate,
      gameType: model.gameType,
    })

    if (settingsResult.isFailure) {
      return Result.fail(settingsResult.error)
    }

    // Get owner UUID from user
    const owner = await UserModel.find(model.ownerId)
    if (!owner) {
      return Result.fail('Owner not found')
    }

    // Create lobby entity (use UUID as id)
    const lobbyResult = Lobby.create(
      {
        ownerId: owner.userUuid,
        settings: settingsResult.value,
        status: model.status as LobbyStatus,
        invitationCode: model.invitationCode || undefined,
        gameId: model.gameId || undefined,
      },
      model.uuid // Use UUID as domain id
    )

    if (lobbyResult.isFailure) {
      return Result.fail(lobbyResult.error)
    }

    // Create players
    const players: Player[] = []
    for (const playerModel of model.players) {
      // Get user UUID
      const playerUser = await UserModel.find(playerModel.userId)
      if (!playerUser) {
        continue // Skip if user not found
      }

      const playerResult = Player.create(
        {
          userId: playerUser.userUuid, // Use UUID for domain
          username: playerModel.username,
          lobbyId: model.uuid, // Use UUID for domain
          isOwner: playerModel.isOwner,
        },
        playerModel.id.toString() // Convert to string for domain
      )

      if (playerResult.isSuccess) {
        const player = playerResult.value
        // Set ready status
        await player.setReady(playerModel.isReady)
        players.push(player)
      }
    }

    // Create aggregate
    const aggregate = LobbyAgg.create(lobbyResult.value, players)

    return Result.ok(aggregate)
  }
}
