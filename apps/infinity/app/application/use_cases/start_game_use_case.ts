import Game from '../../domain/entities/game.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { GameRepository } from '../repositories/game_repository.js'
import { GameStartedEvent } from '../../domain/events/lobby_events.js'
import { Result } from '../../domain/shared/result.js'
import { TransmitLobbyService } from '../services/transmit_lobby_service.js'

export interface StartGameRequest {
  userUuid: string
  lobbyUuid: string
}

export interface StartGameResponse {
  game: {
    uuid: string
    status: string
    players: Array<{
      uuid: string
      nickName: string
    }>
    gameData: {
      currentRound: number
      currentTurn: number
      deck: {
        remaining: number
      }
      discardPile: any[]
      eliminatedPlayers: string[]
    }
    startedAt: Date
    currentPlayer?: {
      uuid: string
      nickName: string
    }
    activePlayers: Array<{
      uuid: string
      nickName: string
    }>
  }
  lobbyDeleted: boolean
}

export class StartGameUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private gameRepository: GameRepository,
    private notificationService: TransmitLobbyService
  ) {}

  async execute(request: StartGameRequest): Promise<Result<StartGameResponse>> {
    try {
      // Validation des données d'entrée
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<StartGameResponse>(validationResult.error)
      }

      // Récupérer le lobby
      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

      // Vérifier que l'utilisateur est le créateur du lobby
      // Le createdBy contient l'UUID du Player créateur
      const requestingPlayer = lobby.players.find((p) => p.uuid === request.userUuid)
      if (!requestingPlayer || requestingPlayer.uuid !== lobby.createdBy) {
        return Result.fail('Only the lobby creator can start the game')
      }

      // Vérifier que le lobby peut démarrer une partie
      if (!lobby.canStart) {
        return Result.fail('Lobby is not ready to start a game')
      }

      // Démarrer la partie dans le lobby (cela génère l'UUID de la partie)
      const gameResult = lobby.startGame()
      if (gameResult.isFailure) {
        return Result.fail(gameResult.error || 'Failed to start game')
      }
      const gameUuid = gameResult.value

      // Sauvegarder le lobby mis à jour
      await this.lobbyRepository.save(lobby)

      // Créer l'entité Game
      const game = Game.create({
        uuid: gameUuid,
        players: lobby.players,
      })

      // Sauvegarder la partie
      await this.gameRepository.save(game)

      // Notifier que le jeu a commencé avant de supprimer le lobby
      this.notificationService.notifyGameStarted(lobby.uuid, gameUuid, {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
      })

      // Supprimer le lobby de la mémoire (il est maintenant persisté en base)
      await this.lobbyRepository.delete(lobby.uuid)

      // Enregistrer l'événement de démarrage de partie
      new GameStartedEvent(game.uuid, lobby.uuid, game.players)

      const response: StartGameResponse = {
        game: {
          uuid: game.uuid,
          status: game.status,
          players: game.players,
          gameData: game.gameData,
          startedAt: game.startedAt,
          currentPlayer: game.currentPlayer,
          activePlayers: game.activePlayers,
        },
        lobbyDeleted: true,
      }

      return Result.ok(response)
    } catch (error) {
      return Result.fail(
        `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private validateRequest(request: StartGameRequest): Result<void> {
    if (!request.userUuid || !request.userUuid.trim()) {
      return Result.fail('User UUID is required')
    }
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      return Result.fail('Lobby UUID is required')
    }
    return Result.ok(undefined)
  }
}
