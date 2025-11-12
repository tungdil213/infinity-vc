import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { CreateLobbyCommand } from './create_lobby.command.js'
import type { LobbyAggregate } from '../../../domain/aggregates/lobby.aggregate.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'
import { LobbySettings } from '../../../domain/value_objects/lobby_settings.vo.js'
import { Lobby } from '../../../domain/entities/lobby.entity.js'
import { LobbyAggregate as LobbyAgg } from '../../../domain/aggregates/lobby.aggregate.js'
import { LobbyStatus } from '../../../domain/value_objects/lobby_status.vo.js'
import { Player } from '../../../domain/entities/player.entity.js'

export class CreateLobbyHandler implements CommandHandler<CreateLobbyCommand, LobbyAggregate> {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateLobbyCommand): Promise<Result<LobbyAggregate>> {
    // 1. Create settings value object
    const settingsResult = LobbySettings.create({
      name: command.name,
      maxPlayers: command.maxPlayers,
      minPlayers: command.minPlayers,
      isPrivate: command.isPrivate,
      gameType: command.gameType,
    })

    if (settingsResult.isFailure) {
      return Result.fail(settingsResult.error)
    }

    // 2. Create lobby entity
    const lobbyResult = Lobby.create({
      ownerId: command.ownerId,
      settings: settingsResult.value,
      status: LobbyStatus.WAITING,
    })

    if (lobbyResult.isFailure) {
      return Result.fail(lobbyResult.error)
    }

    // 3. Create aggregate
    const aggregate = LobbyAgg.create(lobbyResult.value)

    // 4. Auto-join creator as first player
    const creatorResult = Player.create({
      userId: command.ownerId,
      username: command.ownerName,
      lobbyId: lobbyResult.value.id,
      isOwner: true,
    })

    if (creatorResult.isFailure) {
      return Result.fail(creatorResult.error)
    }

    const addPlayerResult = aggregate.addPlayer(creatorResult.value)
    if (addPlayerResult.isFailure) {
      return Result.fail(addPlayerResult.error)
    }

    // 5. Persist aggregate
    const saveResult = await this.lobbyRepository.save(aggregate)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 5. Publish domain events
    await this.eventBus.publishAll(aggregate.domainEvents)
    aggregate.clearEvents()

    return Result.ok(saveResult.value)
  }
}
