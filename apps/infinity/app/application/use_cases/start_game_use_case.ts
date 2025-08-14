import Game from '../../domain/entities/game.js'
import { LobbyRepository } from '../repositories/lobby_repository.js'
import { GameRepository } from '../repositories/game_repository.js'
import { GameStartedEvent } from '../../domain/events/lobby_events.js'

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
    private gameRepository: GameRepository
  ) {}

  async execute(request: StartGameRequest): Promise<StartGameResponse> {
    // Validation des données d'entrée
    this.validateRequest(request)

    // Récupérer le lobby
    const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

    // Vérifier que l'utilisateur est le créateur du lobby
    if (!lobby.isCreatedBy(request.userUuid)) {
      throw new Error('Only lobby creator can start the game')
    }

    // Vérifier que le lobby peut démarrer une partie
    if (!lobby.canStart) {
      throw new Error('Lobby is not ready to start a game')
    }

    // Démarrer la partie dans le lobby (cela génère l'UUID de la partie)
    const gameUuid = lobby.startGame()

    // Créer l'entité Game
    const game = Game.create({
      uuid: gameUuid,
      players: lobby.players,
    })

    // Sauvegarder la partie
    await this.gameRepository.save(game)

    // Supprimer le lobby (il n'est plus nécessaire une fois la partie démarrée)
    await this.lobbyRepository.delete(lobby.uuid)

    // Enregistrer l'événement de démarrage de partie
    const gameStartedEvent = new GameStartedEvent(game.uuid, lobby.uuid, game.players)

    return {
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
  }

  private validateRequest(request: StartGameRequest): void {
    if (!request.userUuid || !request.userUuid.trim()) {
      throw new Error('User UUID is required')
    }
    if (!request.lobbyUuid || !request.lobbyUuid.trim()) {
      throw new Error('Lobby UUID is required')
    }
  }
}
