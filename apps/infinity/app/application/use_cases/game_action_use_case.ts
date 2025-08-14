import { inject } from '@adonisjs/core'
import { GameRepository } from '../../domain/repositories/game_repository.js'
import { UserRepository } from '../../domain/repositories/user_repository.js'
import { DomainEventPublisher } from '../services/domain_event_publisher.js'
import { OperationResult, OperationResultFactory } from '../../domain/value_objects/operation_result.js'
import { 
  PlayerActionEvent, 
  TurnChangedEvent, 
  GameStateUpdatedEvent,
  PlayerEliminatedEvent,
  GameFinishedEvent 
} from '../../domain/events/game_events.js'
import { Player } from '../../domain/value_objects/player.js'

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

  async execute(request: GameActionRequest): Promise<OperationResult<GameActionResponse>> {
    try {
      // Récupérer la partie
      const game = await this.gameRepository.findByUuid(request.gameUuid)
      if (!game) {
        return OperationResultFactory.failure('Game not found')
      }

      // Vérifier que le joueur peut jouer
      if (!game.canPlayerPlay(request.playerUuid)) {
        return OperationResultFactory.failure('Player cannot play at this time')
      }

      // Récupérer les informations du joueur
      const user = await this.userRepository.findByUuid(request.playerUuid)
      if (!user) {
        return OperationResultFactory.failure('User not found')
      }

      const player = new Player(user.uuid, user.fullName)

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
          return OperationResultFactory.failure(`Unknown action: ${request.action}`)
      }

      if (actionResult.isFailure) {
        return actionResult
      }

      // Sauvegarder l'état du jeu
      await this.gameRepository.save(game)

      // Publier l'événement d'action du joueur
      await this.domainEventPublisher.publish(
        new PlayerActionEvent(
          game.uuid,
          player,
          request.action,
          request.actionData,
          game.toJSON()
        )
      )

      // Publier l'événement de mise à jour de l'état
      await this.domainEventPublisher.publish(
        new GameStateUpdatedEvent(
          game.uuid,
          game.toJSON(),
          player.uuid
        )
      )

      return actionResult
    } catch (error) {
      return OperationResultFactory.failure(`Game action failed: ${error.message}`)
    }
  }

  private async handlePlayCard(game: any, player: Player, actionData: any): Promise<OperationResult<GameActionResponse>> {
    try {
      // Logique spécifique pour jouer une carte
      const { cardId, targetPlayerUuid } = actionData

      if (!cardId) {
        return OperationResultFactory.failure('Card ID is required')
      }

      // Vérifier que le joueur a cette carte
      const playerHand = game.gameData.playerHands[player.uuid] || []
      const cardIndex = playerHand.findIndex((card: any) => card.id === cardId)
      
      if (cardIndex === -1) {
        return OperationResultFactory.failure('Player does not have this card')
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
        
        await this.domainEventPublisher.publish(
          new PlayerEliminatedEvent(
            game.uuid,
            new Player(cardEffect.eliminatedPlayer, 'Player'), // TODO: Get real player name
            player,
            `Eliminated by ${playedCard.name}`,
            game.activePlayers.map((p: any) => new Player(p.uuid, p.nickName))
          )
        )
      }

      // Vérifier si la partie est terminée
      if (game.isFinished) {
        const winner = game.activePlayers[0]
        await this.domainEventPublisher.publish(
          new GameFinishedEvent(
            game.uuid,
            winner ? new Player(winner.uuid, winner.nickName) : null,
            {}, // TODO: Calculate final scores
            game.duration
          )
        )

        return OperationResultFactory.success({
          gameState: game.toJSON(),
          gameFinished: true,
          winner: winner ? new Player(winner.uuid, winner.nickName) : undefined,
        })
      }

      // Passer au joueur suivant
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publish(
          new TurnChangedEvent(
            game.uuid,
            player,
            new Player(nextPlayer.uuid, nextPlayer.nickName),
            game.gameData.currentRound
          )
        )
      }

      return OperationResultFactory.success({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer ? new Player(nextPlayer.uuid, nextPlayer.nickName) : undefined,
        gameFinished: false,
      })
    } catch (error) {
      return OperationResultFactory.failure(`Failed to play card: ${error.message}`)
    }
  }

  private async handleGuessCard(game: any, player: Player, actionData: any): Promise<OperationResult<GameActionResponse>> {
    try {
      const { targetPlayerUuid, guessedCard } = actionData

      if (!targetPlayerUuid || !guessedCard) {
        return OperationResultFactory.failure('Target player and guessed card are required')
      }

      // Vérifier la main du joueur ciblé
      const targetHand = game.gameData.playerHands[targetPlayerUuid] || []
      const hasGuessedCard = targetHand.some((card: any) => card.name === guessedCard)

      if (hasGuessedCard) {
        // Bonne supposition - éliminer le joueur ciblé
        game.eliminatePlayer(targetPlayerUuid)
        
        await this.domainEventPublisher.publish(
          new PlayerEliminatedEvent(
            game.uuid,
            new Player(targetPlayerUuid, 'Target Player'), // TODO: Get real player name
            player,
            `Correctly guessed ${guessedCard}`,
            game.activePlayers.map((p: any) => new Player(p.uuid, p.nickName))
          )
        )
      }

      // Continuer avec le tour suivant
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publish(
          new TurnChangedEvent(
            game.uuid,
            player,
            new Player(nextPlayer.uuid, nextPlayer.nickName),
            game.gameData.currentRound
          )
        )
      }

      return OperationResultFactory.success({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer ? new Player(nextPlayer.uuid, nextPlayer.nickName) : undefined,
        gameFinished: game.isFinished,
      })
    } catch (error) {
      return OperationResultFactory.failure(`Failed to guess card: ${error.message}`)
    }
  }

  private async handleEndTurn(game: any, player: Player): Promise<OperationResult<GameActionResponse>> {
    try {
      // Passer au joueur suivant
      const previousPlayer = game.currentPlayer
      game.nextTurn()
      const nextPlayer = game.currentPlayer

      if (nextPlayer) {
        await this.domainEventPublisher.publish(
          new TurnChangedEvent(
            game.uuid,
            previousPlayer ? new Player(previousPlayer.uuid, previousPlayer.nickName) : null,
            new Player(nextPlayer.uuid, nextPlayer.nickName),
            game.gameData.currentRound
          )
        )
      }

      return OperationResultFactory.success({
        gameState: game.toJSON(),
        nextPlayer: nextPlayer ? new Player(nextPlayer.uuid, nextPlayer.nickName) : undefined,
        gameFinished: false,
      })
    } catch (error) {
      return OperationResultFactory.failure(`Failed to end turn: ${error.message}`)
    }
  }

  private async handleForfeit(game: any, player: Player): Promise<OperationResult<GameActionResponse>> {
    try {
      // Éliminer le joueur qui abandonne
      game.eliminatePlayer(player.uuid)

      await this.domainEventPublisher.publish(
        new PlayerEliminatedEvent(
          game.uuid,
          player,
          null,
          'Player forfeited',
          game.activePlayers.map((p: any) => new Player(p.uuid, p.nickName))
        )
      )

      // Vérifier si la partie est terminée
      if (game.isFinished) {
        const winner = game.activePlayers[0]
        await this.domainEventPublisher.publish(
          new GameFinishedEvent(
            game.uuid,
            winner ? new Player(winner.uuid, winner.nickName) : null,
            {}, // TODO: Calculate final scores
            game.duration
          )
        )

        return OperationResultFactory.success({
          gameState: game.toJSON(),
          gameFinished: true,
          winner: winner ? new Player(winner.uuid, winner.nickName) : undefined,
        })
      }

      return OperationResultFactory.success({
        gameState: game.toJSON(),
        gameFinished: false,
      })
    } catch (error) {
      return OperationResultFactory.failure(`Failed to forfeit: ${error.message}`)
    }
  }

  private async applyCardEffect(game: any, player: Player, card: any, targetPlayerUuid?: string): Promise<any> {
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
