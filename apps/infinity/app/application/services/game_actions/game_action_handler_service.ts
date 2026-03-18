import type Game from '#domain/entities/game'
import type Player from '#domain/entities/player'
import { Result } from '#shared/result'
import { safeSystemError } from '#shared/error_sanitizer'
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

  async handlePlayCard(
    game: Game,
    player: Player,
    actionData: Record<string, unknown> | undefined
  ): Promise<Result<GameActionResponse>> {
    try {
      const { cardId, targetPlayerUuid } = (actionData ?? {}) as PlayCardActionData
      if (!cardId) {
        return Result.fail('Card ID is required')
      }

      const playerHand = this.getPlayerHand(game, player.uuid)
      const cardIndex = playerHand.findIndex((card) => card.id === cardId)
      if (cardIndex === -1) {
        return Result.fail('Player does not have this card')
      }

      const playedCard = playerHand.splice(cardIndex, 1)[0]
      game.gameData.discardPile.push({
        ...playedCard,
        playedBy: player.uuid,
        playedAt: new Date(),
        targetPlayer: targetPlayerUuid,
      })

      const effectResult = this.cardEffectService.applyCardEffect(
        game,
        player,
        playedCard,
        targetPlayerUuid
      )

      if (effectResult.eliminated && effectResult.eliminatedPlayer) {
        game.eliminatePlayer(effectResult.eliminatedPlayer)
        const eliminatedPlayer = this.playerFactory.fromGamePlayer({
          uuid: effectResult.eliminatedPlayer,
          nickName: 'Player',
        })
        if (eliminatedPlayer) {
          await this.eventService.publishPlayerEliminated(
            game,
            eliminatedPlayer,
            player,
            `Eliminated by ${playedCard.name}`
          )
        }
      }

      if (game.isFinished) {
        const winner = this.playerFactory.fromGamePlayer(game.activePlayers[0])
        await this.eventService.publishGameFinished(game, winner ?? null)
        return Result.ok({
          gameState: game.toJSON(),
          gameFinished: true,
          winner,
        })
      }

      const nextPlayer = await this.advanceTurn(game, player)
      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'play_card'))
    }
  }

  async handleGuessCard(
    game: Game,
    player: Player,
    actionData: Record<string, unknown> | undefined
  ): Promise<Result<GameActionResponse>> {
    try {
      const { targetPlayerUuid, guessedCard } = (actionData ?? {}) as GuessCardActionData
      if (!targetPlayerUuid || !guessedCard) {
        return Result.fail('Target player and guessed card are required')
      }

      const targetHand = this.getPlayerHand(game, targetPlayerUuid)
      const hasGuessedCard = targetHand.some((card) => card.name === guessedCard)
      if (hasGuessedCard) {
        game.eliminatePlayer(targetPlayerUuid)
        const eliminatedPlayer = this.playerFactory.fromGamePlayer({
          uuid: targetPlayerUuid,
          nickName: 'Target Player',
        })
        if (eliminatedPlayer) {
          await this.eventService.publishPlayerEliminated(
            game,
            eliminatedPlayer,
            player,
            `Correctly guessed ${guessedCard}`
          )
        }
      }

      const nextPlayer = await this.advanceTurn(game, player)
      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: game.isFinished,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'guess_card'))
    }
  }

  async handleEndTurn(game: Game): Promise<Result<GameActionResponse>> {
    try {
      const previousPlayer = this.playerFactory.fromGamePlayerOrNull(game.currentPlayer)
      game.nextTurn()
      const nextPlayer = this.playerFactory.fromGamePlayer(game.currentPlayer)

      if (nextPlayer) {
        await this.eventService.publishTurnChanged(game, previousPlayer, nextPlayer)
      }

      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer,
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'end_turn'))
    }
  }

  async handleForfeit(game: Game, player: Player): Promise<Result<GameActionResponse>> {
    try {
      game.eliminatePlayer(player.uuid)
      await this.eventService.publishPlayerEliminated(game, player, null, 'Player forfeited')

      if (game.isFinished) {
        const winner = this.playerFactory.fromGamePlayer(game.activePlayers[0])
        await this.eventService.publishGameFinished(game, winner ?? null)
        return Result.ok({
          gameState: game.toJSON(),
          gameFinished: true,
          winner,
        })
      }

      return Result.ok({
        gameState: game.toJSON(),
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(safeSystemError(error, 'forfeit'))
    }
  }

  private async advanceTurn(game: Game, previousPlayer: Player): Promise<Player | undefined> {
    game.nextTurn()
    const nextPlayer = this.playerFactory.fromGamePlayer(game.currentPlayer)
    if (nextPlayer) {
      await this.eventService.publishTurnChanged(game, previousPlayer, nextPlayer)
    }
    return nextPlayer
  }

  private getPlayerHand(game: Game, playerUuid: string): GameActionCard[] {
    return (game.gameData.playerHands[playerUuid] as GameActionCard[]) || []
  }
}
