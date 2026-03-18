import { inject } from '@adonisjs/core'
import { Effect } from 'effect'
import type { GameRepository } from '#application/repositories/game_repository'
import type { UserRepository } from '#application/repositories/user_repository'
import type { DomainEventPublisher } from '#application/services/domain_event_publisher'
import type Game from '#domain/entities/game'
import type Player from '#domain/entities/player'
import { Result } from '#shared/result'
import { runEffectAsResult } from '#shared/effect_result'
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
    const self = this
    const actionProgram = Effect.gen(function* () {
      const game = yield* Effect.tryPromise({
        try: () => self.gameRepository.findByUuid(request.gameUuid),
        catch: (error) => error,
      })
      if (!game) {
        return yield* Effect.fail('Game not found')
      }

      if (!game.canPlayerPlay(request.playerUuid)) {
        return yield* Effect.fail('Player cannot play at this time')
      }

      const user = yield* Effect.tryPromise({
        try: () => self.userRepository.findByUuid(request.playerUuid),
        catch: (error) => error,
      })
      if (!user) {
        return yield* Effect.fail('User not found')
      }

      const player = self.playerFactory.fromUser(user)
      const actionResponse = yield* self.dispatchAction(game, player, request)

      yield* Effect.tryPromise({
        try: () => self.gameRepository.save(game),
        catch: (error) => error,
      })

      yield* self.eventService.publishPostAction(
        game,
        player,
        request.action,
        request.actionData
      )

      return actionResponse
    })

    return runEffectAsResult(actionProgram, 'game_action', request.playerUuid)
  }

  private dispatchAction(
    game: Game,
    player: Player,
    request: GameActionRequest
  ): Effect.Effect<GameActionResponse, unknown> {
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
        return Effect.fail(`Unknown action: ${request.action}`)
    }
  }
}
