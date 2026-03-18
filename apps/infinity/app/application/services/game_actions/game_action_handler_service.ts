import { Effect } from 'effect'
import type Game from '#domain/entities/game'
import type Player from '#domain/entities/player'
import { GameActionEventService } from '#application/services/game_actions/game_action_event_service'
import {
  type GameActionCard,
  type GameActionResponse,
} from '#application/services/game_actions/game_action_contracts'
import { GameActionPlayerFactory } from '#application/services/game_actions/game_action_player_factory'
import { LoveLetterCardEffectService } from '#application/services/game_actions/love_letter_card_effect_service'

type PlayCardActionData = {
  cardId?: string
  targetPlayerUuid?: string
}

type GuessCardActionData = {
  targetPlayerUuid?: string
  guessedCard?: string
}

export class GameActionHandlerService {
  constructor(
    private readonly eventService: GameActionEventService,
    private readonly playerFactory: GameActionPlayerFactory = new GameActionPlayerFactory(),
    private readonly cardEffectService: LoveLetterCardEffectService = new LoveLetterCardEffectService()
  ) {}

  handlePlayCard(
    game: Game,
    player: Player,
    actionData: Record<string, unknown> | undefined
  ): Effect.Effect<GameActionResponse, unknown> {
    const self = this

    return Effect.gen(function* () {
      const { cardId, targetPlayerUuid } = (actionData ?? {}) as PlayCardActionData
      if (!cardId) {
        return yield* Effect.fail('Card ID is required')
      }

      const playerHand = self.getPlayerHand(game, player.uuid)
      const cardIndex = playerHand.findIndex((card) => card.id === cardId)
      if (cardIndex === -1) {
        return yield* Effect.fail('Player does not have this card')
      }

      const playedCard = playerHand.splice(cardIndex, 1)[0]
      game.gameData.discardPile.push({
        ...playedCard,
        playedBy: player.uuid,
        playedAt: new Date(),
        targetPlayer: targetPlayerUuid,
      })

      const effectResult = self.cardEffectService.applyCardEffect(
        game,
        player,
        playedCard,
        targetPlayerUuid
      )

      if (effectResult.eliminated && effectResult.eliminatedPlayer) {
        game.eliminatePlayer(effectResult.eliminatedPlayer)
        const eliminatedPlayer = self.playerFactory.fromGamePlayer({
          uuid: effectResult.eliminatedPlayer,
          nickName: 'Player',
        })
        if (eliminatedPlayer) {
          yield* self.eventService.publishPlayerEliminated(
            game,
            eliminatedPlayer,
            player,
            `Eliminated by ${playedCard.name}`
          )
        }
      }

      if (game.isFinished) {
        const winner = self.playerFactory.fromGamePlayer(game.activePlayers[0])
        yield* self.eventService.publishGameFinished(game, winner ?? null)
        return {
          gameState: game.toJSON(),
          gameFinished: true,
          winner,
        }
      }

      const nextPlayer = yield* self.advanceTurn(game, player)
      return {
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: false,
      }
    })
  }

  handleGuessCard(
    game: Game,
    player: Player,
    actionData: Record<string, unknown> | undefined
  ): Effect.Effect<GameActionResponse, unknown> {
    const self = this

    return Effect.gen(function* () {
      const { targetPlayerUuid, guessedCard } = (actionData ?? {}) as GuessCardActionData
      if (!targetPlayerUuid || !guessedCard) {
        return yield* Effect.fail('Target player and guessed card are required')
      }

      const targetHand = self.getPlayerHand(game, targetPlayerUuid)
      const hasGuessedCard = targetHand.some((card) => card.name === guessedCard)
      if (hasGuessedCard) {
        game.eliminatePlayer(targetPlayerUuid)
        const eliminatedPlayer = self.playerFactory.fromGamePlayer({
          uuid: targetPlayerUuid,
          nickName: 'Target Player',
        })
        if (eliminatedPlayer) {
          yield* self.eventService.publishPlayerEliminated(
            game,
            eliminatedPlayer,
            player,
            `Correctly guessed ${guessedCard}`
          )
        }
      }

      const nextPlayer = yield* self.advanceTurn(game, player)
      return {
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: game.isFinished,
      }
    })
  }

  handleEndTurn(game: Game): Effect.Effect<GameActionResponse, unknown> {
    const self = this

    return Effect.gen(function* () {
      const previousPlayer = self.playerFactory.fromGamePlayerOrNull(game.currentPlayer)
      game.nextTurn()
      const nextPlayer = self.playerFactory.fromGamePlayer(game.currentPlayer)

      if (nextPlayer) {
        yield* self.eventService.publishTurnChanged(game, previousPlayer, nextPlayer)
      }

      return {
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: false,
      }
    })
  }

  handleForfeit(game: Game, player: Player): Effect.Effect<GameActionResponse, unknown> {
    const self = this

    return Effect.gen(function* () {
      game.eliminatePlayer(player.uuid)
      yield* self.eventService.publishPlayerEliminated(game, player, null, 'Player forfeited')

      if (game.isFinished) {
        const winner = self.playerFactory.fromGamePlayer(game.activePlayers[0])
        yield* self.eventService.publishGameFinished(game, winner ?? null)
        return {
          gameState: game.toJSON(),
          gameFinished: true,
          winner,
        }
      }

      return {
        gameState: game.toJSON(),
        gameFinished: false,
      }
    })
  }

  private advanceTurn(
    game: Game,
    previousPlayer: Player
  ): Effect.Effect<Player | undefined, unknown> {
    const self = this

    return Effect.gen(function* () {
      game.nextTurn()
      const nextPlayer = self.playerFactory.fromGamePlayer(game.currentPlayer)
      if (nextPlayer) {
        yield* self.eventService.publishTurnChanged(game, previousPlayer, nextPlayer)
      }
      return nextPlayer
    })
  }

  private getPlayerHand(game: Game, playerUuid: string): GameActionCard[] {
    return (game.gameData.playerHands[playerUuid] as GameActionCard[]) || []
  }
}
