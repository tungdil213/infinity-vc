import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { CreateGameCommand } from './create_game.command.js'
import type { Game } from '../../../domain/entities/game.entity.js'
import { Game as GameEntity } from '../../../domain/entities/game.entity.js'
import type { GameRepository } from '../../../domain/repositories/game_repository.interface.js'
import { GamePluginRegistry } from '../../../domain/plugins/game_plugin_registry.js'
import { GameCreatedEvent } from '../../../domain/events/game_created.event.js'

export class CreateGameHandler implements CommandHandler<CreateGameCommand, Game> {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateGameCommand): Promise<Result<Game>> {
    // 1. Get plugin
    const pluginResult = GamePluginRegistry.getInstance().getPlugin(command.gameType)
    if (pluginResult.isFailure) {
      return Result.fail(pluginResult.error)
    }

    const plugin = pluginResult.value

    // 2. Validate player count
    if (
      command.playerIds.length < plugin.minPlayers ||
      command.playerIds.length > plugin.maxPlayers
    ) {
      return Result.fail(
        `Player count must be between ${plugin.minPlayers} and ${plugin.maxPlayers}`
      )
    }

    // 3. Initialize game state
    const stateResult = plugin.initialize(command.playerIds)
    if (stateResult.isFailure) {
      return Result.fail(stateResult.error)
    }

    // 4. Create game entity
    const gameResult = GameEntity.create({
      lobbyId: command.lobbyId,
      gameType: command.gameType,
      playerIds: command.playerIds,
      state: stateResult.value,
    })

    if (gameResult.isFailure) {
      return Result.fail(gameResult.error)
    }

    const game = gameResult.value

    // 5. Start game
    const startResult = game.start()
    if (startResult.isFailure) {
      return Result.fail(startResult.error)
    }

    // 6. Save game
    const saveResult = await this.gameRepository.save(game)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 7. Publish event
    await this.eventBus.publish(
      new GameCreatedEvent(game.id, command.lobbyId, command.gameType, command.playerIds)
    )

    return Result.ok(saveResult.value)
  }
}
