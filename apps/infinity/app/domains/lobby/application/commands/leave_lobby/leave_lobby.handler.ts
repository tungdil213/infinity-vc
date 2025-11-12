import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { LeaveLobbyCommand } from './leave_lobby.command.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'

export class LeaveLobbyHandler implements CommandHandler<LeaveLobbyCommand, void> {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: LeaveLobbyCommand): Promise<Result<void>> {
    // 1. Find lobby aggregate
    const lobbyResult = await this.lobbyRepository.findById(command.lobbyId)
    if (lobbyResult.isFailure || !lobbyResult.value) {
      return Result.fail('Lobby not found')
    }

    const aggregate = lobbyResult.value

    // 2. Remove player from aggregate
    const removeResult = aggregate.removePlayer(command.userId)
    if (removeResult.isFailure) {
      return Result.fail(removeResult.error)
    }

    // 3. Save aggregate
    const saveResult = await this.lobbyRepository.save(aggregate)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 4. Publish events
    await this.eventBus.publishAll(aggregate.domainEvents)
    aggregate.clearEvents()

    return Result.ok()
  }
}
