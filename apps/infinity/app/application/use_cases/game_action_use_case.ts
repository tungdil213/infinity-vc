import { inject } from '@adonisjs/core'
import type { GameRepository } from '#application/repositories/game_repository'
import type { UserRepository } from '#application/repositories/user_repository'
import type { DomainEventPublisher } from '#application/services/domain_event_publisher'
import type Game from '#domain/entities/game'
import type Player from '#domain/entities/player'
import { Result } from '#shared/result'
import { safeSystemError } from '#shared/error_sanitizer'
import { GameActionEventService } from '#application/services/game_actions/game_action_event_service'
import { GameActionHandlerService } from '#application/services/game_actions/game_action_handler_service'
import {
  GameActionPlayerFactory,
} from '#application/services/game_actions/game_action_player_factory'
import type {
  GameActionRequest,
  GameActionResponse,
} from '#application/services/game_actions/game_action_contracts'

export type { GameActionRequest, GameActionResponse }

@inject()
export class GameActionUseCase {
  private readonly playerFactory: GameActionPlayerFactory
  private readonly eventService: GameActionEventService
  private readonly handlerService: GameActionHandlerService

  constructor(
    private gameRepository: GameRepository,
    private userRepository: UserRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {
    this.playerFactory = new GameActionPlayerFactory()
    this.eventService = new GameActionEventService(this.domainEventPublisher, this.playerFactory)
    this.handlerService = new GameActionHandlerService(this.eventService, this.playerFactory)
  }

  async execute(request: GameActionRequest): Promise<Result<GameActionResponse>> {
    try {
      const game = await this.gameRepository.findByUuid(request.gameUuid)
      if (!game) {
        return Result.fail('Game not found')
      }

      if (!game.canPlayerPlay(request.playerUuid)) {
        return Result.fail('Player cannot play at this time')
      }

      const user = await this.userRepository.findByUuid(request.playerUuid)
      if (!user) {
        return Result.fail('User not found')
      }

      const player = this.playerFactory.fromUser(user)
      const actionResult = await this.dispatchAction(game, player, request)
      if (actionResult.isFailure) {
        return actionResult
      }

      await this.gameRepository.save(game)
      await this.eventService.publishPostAction(
        game,
        player,
        request.action,
        request.actionData
      )

      return actionResult
    } catch (error) {
      return Result.fail(safeSystemError(error, 'game_action'))
    }
  }

  private dispatchAction(
    game: Game,
    player: Player,
    request: GameActionRequest
  ): Promise<Result<GameActionResponse>> {
    switch (request.action) {
      case 'play_card':
        return this.handlerService.handlePlayCard(game, player, request.actionData)
      case 'guess_card':
        return this.handlerService.handleGuessCard(game, player, request.actionData)
      case 'end_turn':
        return this.handlerService.handleEndTurn(game)
      case 'forfeit':
        return this.handlerService.handleForfeit(game, player)
      default:
        return Promise.resolve(Result.fail(`Unknown action: ${request.action}`))
    }
  }
}
