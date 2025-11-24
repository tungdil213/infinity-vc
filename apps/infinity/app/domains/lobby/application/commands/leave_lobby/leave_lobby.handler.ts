import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { LeaveLobbyCommand } from './leave_lobby.command.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('LeaveLobbyHandler')

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
    const playerCountBefore = aggregate.playersList.length

    // 2. Remove player from aggregate
    const removeResult = aggregate.removePlayer(command.userId)
    if (removeResult.isFailure) {
      return Result.fail(removeResult.error)
    }

    const playerCountAfter = aggregate.playersList.length
    logger.info(
      {
        lobbyId: command.lobbyId,
        userId: command.userId,
        playerCountBefore,
        playerCountAfter,
        emittedEvents: aggregate.domainEvents.map((e) => e.eventName),
      },
      'Player removed from lobby'
    )

    // 3. Check if lobby is empty (LobbyClosedEvent was emitted)
    const lobbyClosedEvent = aggregate.domainEvents.find((e) => e.eventName === 'lobby.closed')

    if (lobbyClosedEvent) {
      logger.info({ lobbyId: command.lobbyId }, 'Lobby is empty - deleting from repository')
      // Lobby is empty → Delete from repository
      await this.lobbyRepository.delete(command.lobbyId)
    } else {
      logger.debug({ lobbyId: command.lobbyId, playerCount: playerCountAfter }, 'Lobby still has players - saving updated state')
      // Lobby still has players → Save updated state
      const saveResult = await this.lobbyRepository.save(aggregate)
      if (saveResult.isFailure) {
        return Result.fail(saveResult.error)
      }
    }

    // 4. Publish events (lobby.closed, lobby.owner.changed, or lobby.player.left)
    logger.info(
      {
        lobbyId: command.lobbyId,
        events: aggregate.domainEvents.map((e) => e.eventName),
      },
      'Publishing domain events'
    )
    await this.eventBus.publishAll(aggregate.domainEvents)
    aggregate.clearEvents()

    return Result.ok()
  }
}
