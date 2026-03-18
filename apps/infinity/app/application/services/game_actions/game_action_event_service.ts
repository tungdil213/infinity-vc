import type Game from '#domain/entities/game'
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

  async publishPostAction(
    game: Game,
    actor: Player,
    action: string,
    actionData: Record<string, unknown> | undefined
  ): Promise<void> {
    await this.domainEventPublisher.publishEvents([
      new PlayerActionEvent(game.uuid, actor, action, actionData, game.toJSON()),
      new GameStateUpdatedEvent(game.uuid, game.toJSON(), actor.uuid),
    ])
  }

  async publishPlayerEliminated(
    game: Game,
    eliminatedPlayer: Player,
    actor: Player | null,
    reason: string
  ): Promise<void> {
    const remainingPlayers = this.playerFactory.fromGamePlayers(game.activePlayers)
    await this.domainEventPublisher.publishEvents([
      new PlayerEliminatedEvent(game.uuid, eliminatedPlayer, actor, reason, remainingPlayers),
    ])
  }

  async publishTurnChanged(
    game: Game,
    previousPlayer: Player | null,
    nextPlayer: Player
  ): Promise<void> {
    await this.domainEventPublisher.publishEvents([
      new TurnChangedEvent(game.uuid, previousPlayer, nextPlayer, game.gameData.currentRound),
    ])
  }

  async publishGameFinished(game: Game, winner: Player | null): Promise<void> {
    await this.domainEventPublisher.publishEvents([
      new GameFinishedEvent(game.uuid, winner, {}, game.duration),
    ])
  }
}
