import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { PlayMoveCommand } from './play_move.command.js'
import type { GameRepository } from '../../../domain/repositories/game_repository.interface.js'
import { GamePluginRegistry } from '../../../domain/plugins/game_plugin_registry.js'
import { MovePlayedEvent } from '../../../domain/events/move_played.event.js'
import { GameCompletedEvent } from '../../../domain/events/game_completed.event.js'

export class PlayMoveHandler implements CommandHandler<PlayMoveCommand, void> {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: PlayMoveCommand): Promise<Result<void>> {
    // 1. Find game
    const gameResult = await this.gameRepository.findById(command.gameId)
    if (gameResult.isFailure || !gameResult.value) {
      return Result.fail('Game not found')
    }

    const game = gameResult.value

    // 2. Check if player can play
    if (game.currentPlayerId !== command.playerId) {
      return Result.fail('Not your turn')
    }

    // 3. Get plugin
    const pluginResult = GamePluginRegistry.getInstance().getPlugin(game.gameType)
    if (pluginResult.isFailure) {
      return Result.fail(pluginResult.error)
    }

    const plugin = pluginResult.value

    // 4. Validate move
    const validateResult = plugin.validateMove(game.state, command.playerId, command.move)
    if (validateResult.isFailure || !validateResult.value) {
      return Result.fail('Invalid move')
    }

    // 5. Apply move
    const newStateResult = plugin.applyMove(game.state, command.playerId, command.move)
    if (newStateResult.isFailure) {
      return Result.fail(newStateResult.error)
    }

    // 6. Update game state
    const updateResult = game.updateState(newStateResult.value)
    if (updateResult.isFailure) {
      return Result.fail(updateResult.error)
    }

    // 7. Check if game is finished
    if (plugin.isGameFinished(newStateResult.value)) {
      const winnerId = plugin.getWinner(newStateResult.value)
      game.complete(winnerId ?? undefined)

      await this.eventBus.publish(new GameCompletedEvent(game.id, winnerId ?? undefined))
    }

    // 8. Save game
    const saveResult = await this.gameRepository.save(game)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 9. Publish move event
    await this.eventBus.publish(
      new MovePlayedEvent(game.id, command.playerId, command.move, game.state.turnNumber)
    )

    return Result.ok()
  }
}
