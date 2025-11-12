import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { StartGameCommand } from './start_game.command.js'
import type { LobbyRepository } from '../../../domain/repositories/lobby_repository.interface.js'

export class StartGameHandler implements CommandHandler<StartGameCommand, void> {
  constructor(
    private readonly lobbyRepository: LobbyRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: StartGameCommand): Promise<Result<void>> {
    // 1. Find lobby aggregate
    const lobbyResult = await this.lobbyRepository.findById(command.lobbyId)
    if (lobbyResult.isFailure || !lobbyResult.value) {
      return Result.fail('Lobby not found')
    }

    const aggregate = lobbyResult.value

    // 2. Check if user is owner
    if (!aggregate.isOwner(command.userId)) {
      return Result.fail('Only lobby owner can start game')
    }

    // 3. Start game
    const startResult = aggregate.startGame(command.gameId)
    if (startResult.isFailure) {
      return Result.fail(startResult.error)
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
