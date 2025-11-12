import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { JoinLobbyCommand } from './join_lobby.command.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'
import { Player } from '../../../domain/entities/player.entity.js'

export class JoinLobbyHandler implements CommandHandler<JoinLobbyCommand, void> {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: JoinLobbyCommand): Promise<Result<void>> {
    // 1. Find lobby aggregate
    const lobbyResult = await this.lobbyRepository.findById(command.lobbyId)
    if (lobbyResult.isFailure || !lobbyResult.value) {
      return Result.fail('Lobby not found')
    }

    const aggregate = lobbyResult.value

    // 2. Create player entity
    const playerResult = Player.create({
      userId: command.userId,
      username: command.username,
      lobbyId: command.lobbyId,
      isOwner: false,
    })

    if (playerResult.isFailure) {
      return Result.fail(playerResult.error)
    }

    // 3. Add player to aggregate
    const addResult = aggregate.addPlayer(playerResult.value)
    if (addResult.isFailure) {
      return Result.fail(addResult.error)
    }

    // 4. Save aggregate
    const saveResult = await this.lobbyRepository.save(aggregate)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 5. Publish events
    await this.eventBus.publishAll(aggregate.domainEvents)
    aggregate.clearEvents()

    return Result.ok()
  }
}
