import { inject } from '@adonisjs/core'
import type { GameRepository } from '../repositories/game_repository.js'
import type { UserRepository } from '../repositories/user_repository.js'
import type { DomainEventPublisher } from '../services/domain_event_publisher.js'
import { Result } from '../../domain/shared/result.js'
import {
  PlayerActionEvent,
  TurnChangedEvent,
  GameStateUpdatedEvent,
  PlayerEliminatedEvent,
  GameFinishedEvent,
} from '../../domain/events/game_events.js'
import Player from '../../domain/entities/player.js'

export interface GameActionRequest {
  gameUuid: string
  playerUuid: string
  action: string
  actionData?: any
}

export interface GameActionResponse {
  gameState: any
  nextPlayer?: Player
  gameFinished?: boolean
  winner?: Player
}

@inject()
export class GameActionUseCase {
  constructor(
    private gameRepository: GameRepository,
    private userRepository: UserRepository,
    private domainEventPublisher: DomainEventPublisher
  ) {}

  async execute(request: GameActionRequest): Promise<Result<GameActionResponse>> {
    try {
      // Récupérer la partie
      const game = await this.gameRepository.findByUuid(request.gameUuid)
      if (!game) {
        return Result.fail('Game not found')
      }

      // Vérifier que le joueur peut jouer
      if (!game.canPlayerPlay(request.playerUuid)) {
        return Result.fail('Player cannot play at this time')
      }

      // Récupérer les informations du joueur
      const user = await this.userRepository.findByUuid(request.playerUuid)
      if (!user) {
        return Result.fail('User not found')
      }

      const player = Player.create({
        userUuid: user.uuid,
        nickName: user.fullName,
      })

      // Traiter l'action selon son type
      let actionResult
      switch (request.action) {
        case 'play_card':
          actionResult = await this.handlePlayCard(game, player, request.actionData)
          break
        case 'guess_card':
          actionResult = await this.handleGuessCard(game, player, request.actionData)
          break
        case 'end_turn':
          actionResult = await this.handleEndTurn(game, player)
          break
        case 'forfeit':
          actionResult = await this.handleForfeit(game, player)
          break
        default:
          return Result.fail(`Unknown action: ${request.action}`)
      }

      if (actionResult.isFailure) {
        return actionResult
      }

      // Sauvegarder l'état du jeu
      await this.gameRepository.save(game)

      // Publier l'événement d'action du joueur
      await this.domainEventPublisher.publishEvents([
        new PlayerActionEvent(game.uuid, player, request.action, request.actionData, game.toJSON()),
      ])

      // Publier l'événement de mise à jour de l'état
      await this.domainEventPublisher.publishEvents([
        new GameStateUpdatedEvent(game.uuid, game.toJSON(), player.uuid),
      ])

      return actionResult
    } catch (error) {
      return Result.fail(`Game action failed: ${error.message}`)
    }
  }

  private async handlePlayCard(
    game: any,
    player: Player,
    actionData: any
  ): Promise<Result<GameActionResponse>> {
    try {
      // Logique spécifique pour jouer une carte
      const { cardId, targetPlayerUuid } = actionData

      if (!cardId) {
        return Result.fail('Card ID is required')
      }

      // Vérifier que le joueur a cette carte
      const playerHand = game.gameData.playerHands[player.uuid] || []
      const cardIndex = playerHand.findIndex((card: any) => card.id === cardId)

      if (cardIndex === -1) {
        return Result.fail('Player does not have this card')
      }

      // Retirer la carte de la main du joueur
      const playedCard = playerHand.splice(cardIndex, 1)[0]

      // Ajouter la carte à la pile de défausse
      game.gameData.discardPile.push({
        ...playedCard,
        playedBy: player.uuid,
        playedAt: new Date(),
        targetPlayer: targetPlayerUuid,
      })

      // Appliquer l'effet de la carte selon son type
      const cardEffect = await this.applyCardEffect(game, player, playedCard, targetPlayerUuid)

      if (cardEffect.eliminated) {
        // Éliminer le joueur ciblé
        game.eliminatePlayer(cardEffect.eliminatedPlayer)

        await this.domainEventPublisher.publishEvents([
          new PlayerEliminatedEvent(
            game.uuid,
            Player.create({
              userUuid: cardEffect.eliminatedPlayer,
              nickName: 'Player', // TODO: Get real player name
            }),
            player,
            `Eliminated by ${playedCard.name}`,
            game.activePlayers.map((p: any) =>
              Player.create({
                userUuid: p.uuid,
                nickName: p.nickName,
              })
            )
          ),
        ])
      }

      // Vérifier si la partie est terminée
      if (game.isFinished) {
        const winner = game.activePlayers[0]
        await this.domainEventPublisher.publishEvents([
          new GameFinishedEvent(
            game.uuid,
            winner
              ? Player.create({
                  userUuid: winner.uuid,
                  nickName: winner.nickName,
                })
              : null,
            {}, // TODO: Calculate final scores
            game.duration
          ),
        ])

        return Result.ok({
          gameState: game.toJSON(),
          gameFinished: true,
          winner: winner
            ? Player.create({
                userUuid: winner.uuid,
                nickName: winner.nickName,
              })
            : undefined,
        })
      }

      // Passer au joueur suivant
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publishEvents([
          new TurnChangedEvent(
            game.uuid,
            player,
            Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            }),
            game.gameData.currentRound
          ),
        ])
      }

      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer
          ? Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            })
          : undefined,
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(`Failed to play card: ${error.message}`)
    }
  }

  private async handleGuessCard(
    game: any,
    player: Player,
    actionData: any
  ): Promise<Result<GameActionResponse>> {
    try {
      const { targetPlayerUuid, guessedCard } = actionData

      if (!targetPlayerUuid || !guessedCard) {
        return Result.fail('Target player and guessed card are required')
      }

      // Vérifier la main du joueur ciblé
      const targetHand = game.gameData.playerHands[targetPlayerUuid] || []
      const hasGuessedCard = targetHand.some((card: any) => card.name === guessedCard)

      if (hasGuessedCard) {
        // Bonne supposition - éliminer le joueur ciblé
        game.eliminatePlayer(targetPlayerUuid)

        await this.domainEventPublisher.publishEvents([
          new PlayerEliminatedEvent(
            game.uuid,
            Player.create({
              userUuid: targetPlayerUuid,
              nickName: 'Target Player',
            }), // TODO: Get real player name
            player,
            `Correctly guessed ${guessedCard}`,
            game.activePlayers.map((p: any) =>
              Player.create({
                userUuid: p.uuid,
                nickName: p.nickName,
              })
            )
          ),
        ])
      }

      // Continuer avec le tour suivant
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publishEvents([
          new TurnChangedEvent(
            game.uuid,
            player,
            Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            }),
            game.gameData.currentRound
          ),
        ])
      }

      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer
          ? Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            })
          : undefined,
        gameFinished: game.isFinished,
      })
    } catch (error) {
      return Result.fail(`Failed to guess card: ${error.message}`)
    }
  }

  private async handleEndTurn(game: any, player: Player): Promise<Result<GameActionResponse>> {
    try {
      // Passer au joueur suivant
      const previousPlayer = game.currentPlayer
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publishEvents([
          new TurnChangedEvent(
            game.uuid,
            previousPlayer
              ? Player.create({
                  userUuid: previousPlayer.uuid,
                  nickName: previousPlayer.nickName,
                })
              : null,
            Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            }),
            game.gameData.currentRound
          ),
        ])
      }

      return Result.ok({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer
          ? Player.create({
              userUuid: nextPlayer.uuid,
              nickName: nextPlayer.nickName,
            })
          : undefined,
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(`Failed to end turn: ${error.message}`)
    }
  }

  private async handleForfeit(game: any, player: Player): Promise<Result<GameActionResponse>> {
    try {
      // Éliminer le joueur qui abandonne
      game.eliminatePlayer(player.uuid)

      await this.domainEventPublisher.publishEvents([
        new PlayerEliminatedEvent(
          game.uuid,
          player,
          null,
          'Player forfeited',
          game.activePlayers.map((p: any) =>
            Player.create({
              userUuid: p.uuid,
              nickName: p.nickName,
            })
          )
        ),
      ])

      // Vérifier si la partie est terminée
      if (game.isFinished) {
        const winner = game.activePlayers[0]
        await this.domainEventPublisher.publishEvents([
          new GameFinishedEvent(
            game.uuid,
            winner
              ? Player.create({
                  userUuid: winner.uuid,
                  nickName: winner.nickName,
                })
              : null,
            {}, // TODO: Calculate final scores
            game.duration
          ),
        ])

        return Result.ok({
          gameState: game.toJSON(),
          gameFinished: true,
          winner: winner
            ? Player.create({
                userUuid: winner.uuid,
                nickName: winner.nickName,
              })
            : undefined,
        })
      }

      return Result.ok({
        gameState: game.toJSON(),
        gameFinished: false,
      })
    } catch (error) {
      return Result.fail(`Failed to forfeit: ${error.message}`)
    }
  }

  private async applyCardEffect(
    game: any,
    player: Player,
    card: any,
    targetPlayerUuid?: string
  ): Promise<any> {
    // Logique spécifique aux cartes (exemple Love Letter)
    switch (card.name) {
      case 'Guard':
        // Le joueur peut deviner la carte d'un autre joueur
        return { eliminated: false }

      case 'Priest':
        // Le joueur peut voir la carte d'un autre joueur
        return { eliminated: false }

      case 'Baron':
        // Comparer les cartes avec un autre joueur
        if (targetPlayerUuid) {
          const playerHand = game.gameData.playerHands[player.uuid] || []
          const targetHand = game.gameData.playerHands[targetPlayerUuid] || []

          if (playerHand.length > 0 && targetHand.length > 0) {
            const playerCard = playerHand[0]
            const targetCard = targetHand[0]

            if (playerCard.value < targetCard.value) {
              return { eliminated: true, eliminatedPlayer: player.uuid }
            } else if (targetCard.value < playerCard.value) {
              return { eliminated: true, eliminatedPlayer: targetPlayerUuid }
            }
          }
        }
        return { eliminated: false }

      case 'Handmaid':
        // Le joueur est protégé jusqu'au prochain tour
        return { eliminated: false }

      case 'Prince':
        // Le joueur ciblé défausse sa carte et en pioche une nouvelle
        if (targetPlayerUuid) {
          const targetHand = game.gameData.playerHands[targetPlayerUuid] || []
          if (targetHand.length > 0) {
            const discardedCard = targetHand.pop()
            game.gameData.discardPile.push(discardedCard)

            // Si c'est la Princesse, le joueur est éliminé
            if (discardedCard.name === 'Princess') {
              return { eliminated: true, eliminatedPlayer: targetPlayerUuid }
            }

            // Piocher une nouvelle carte (simulation)
            // TODO: Implémenter la logique de pioche
          }
        }
        return { eliminated: false }

      case 'King':
        // Échanger les cartes avec un autre joueur
        if (targetPlayerUuid) {
          const playerHand = game.gameData.playerHands[player.uuid] || []
          const targetHand = game.gameData.playerHands[targetPlayerUuid] || []

          if (playerHand.length > 0 && targetHand.length > 0) {
            const temp = playerHand[0]
            playerHand[0] = targetHand[0]
            targetHand[0] = temp
          }
        }
        return { eliminated: false }

      case 'Countess':
        // Doit être jouée si le joueur a le Roi ou le Prince
        return { eliminated: false }

      case 'Princess':
        // Si jouée, le joueur est éliminé
        return { eliminated: true, eliminatedPlayer: player.uuid }

      default:
        return { eliminated: false }
    }
  }
}
