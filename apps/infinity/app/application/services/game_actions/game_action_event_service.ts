import type Game from '#domain/entities/game'
import { Effect } from 'effect'
import {
  GameFinishedEvent,
  GameStateUpdatedEvent,
  PlayerActionEvent,
  PlayerEliminatedEvent,
  TurnChangedEvent,
} from '#domain/events/game_events'
import type Player from '#domain/entities/player'
import type { DomainEventPublisher } from '#application/services/domain_event_publisher'
import { GameActionPlayerFactory } from '#application/services/game_actions/game_action_player_factory'

export class GameActionEventService {
  constructor(
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly playerFactory: GameActionPlayerFactory = new GameActionPlayerFactory()
  ) {}

  publishPostAction(
    game: Game,
    actor: Player,
    action: string,
    actionData: Record<string, unknown> | undefined
  ): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.domainEventPublisher.publishEvents([
          new PlayerActionEvent(game.uuid, actor, action, actionData, game.toJSON()),
          new GameStateUpdatedEvent(game.uuid, game.toJSON(), actor.uuid),
        ]),
      catch: (error) => error,
    })
  }

  publishPlayerEliminated(
    game: Game,
    eliminatedPlayer: Player,
    actor: Player | null,
    reason: string
  ): Effect.Effect<void, unknown> {
    const remainingPlayers = this.playerFactory.fromGamePlayers(game.activePlayers)
    return Effect.tryPromise({
      try: () =>
        this.domainEventPublisher.publishEvents([
          new PlayerEliminatedEvent(game.uuid, eliminatedPlayer, actor, reason, remainingPlayers),
        ]),
      catch: (error) => error,
    })
  }

  publishTurnChanged(
    game: Game,
    previousPlayer: Player | null,
    nextPlayer: Player
  ): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.domainEventPublisher.publishEvents([
          new TurnChangedEvent(game.uuid, previousPlayer, nextPlayer, game.gameData.currentRound),
        ]),
      catch: (error) => error,
    })
  }

  publishGameFinished(game: Game, winner: Player | null): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.domainEventPublisher.publishEvents([
          new GameFinishedEvent(game.uuid, winner, {}, game.duration),
        ]),
      catch: (error) => error,
    })
  }
}
