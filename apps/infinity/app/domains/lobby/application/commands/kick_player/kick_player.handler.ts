import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { KickPlayerCommand } from './kick_player.command.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'

export class KickPlayerHandler implements CommandHandler<KickPlayerCommand, void> {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: KickPlayerCommand): Promise<Result<void>> {
    // 1. Find lobby aggregate
    const lobbyResult = await this.lobbyRepository.findById(command.lobbyId)
    if (lobbyResult.isFailure || !lobbyResult.value) {
      return Result.fail('Lobby not found')
    }

    const aggregate = lobbyResult.value

    // 2. Check if kicker is the owner
    if (aggregate.lobbyEntity.ownerId !== command.kickerId) {
      return Result.fail('Only the lobby owner can kick players')
    }

    // 3. Check if target is not the owner
    if (command.targetUserId === command.kickerId) {
      return Result.fail('You cannot kick yourself')
    }

    // 4. Remove player from aggregate
    const removeResult = aggregate.removePlayer(command.targetUserId)
    if (removeResult.isFailure) {
      return Result.fail(removeResult.error)
    }

    // 5. Save aggregate
    const saveResult = await this.lobbyRepository.save(aggregate)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 6. Publish events
    await this.eventBus.publishAll(aggregate.domainEvents)
    aggregate.clearEvents()

    return Result.ok()
  }
}
