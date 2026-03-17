import Game from '#domain/entities/game'
import { type LobbyRepository } from '#application/repositories/lobby_repository'
import { type GameRepository } from '#application/repositories/game_repository'
import { Result } from '#domain/shared/result'
import { type TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { gameEngineService } from '#application/services/game_engine_service'
import { safeSystemError } from '#domain/shared/error_sanitizer'

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
    /** Love Letter specific game state */
    gameState: {
      phase: string
      currentPlayerId: string | null
      round: number
      turn: number
      isFinished: boolean
      deckCount: number
      discardPile: Array<{ type: string; value: number }>
      players: Array<{
        id: string
        name: string
        isActive: boolean
        isProtected: boolean
        isEliminated: boolean
        handCount: number
      }>
    }
    startedAt: Date
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

      // Démarrer la partie dans le lobby (met à jour le statut)
      const gameResult = lobby.startGame()
      if (gameResult.isFailure) {
        return Result.fail(gameResult.error || 'Failed to start game')
      }

      // Sauvegarder le lobby mis à jour
      await this.lobbyRepository.save(lobby)

      const resolvedGameType = lobby.gameType || 'love-letter-infinity-gauntlet'

      // Créer la session de jeu avec le LoveLetterEngine
      const gameSessionResult = gameEngineService.createGame(
        lobby.uuid,
        lobby.players,
        resolvedGameType,
        lobby.gameSettings
      )
      if (gameSessionResult.isFailure) {
        return Result.fail(gameSessionResult.error)
      }

      const gameSession = gameSessionResult.value
      const gameState = gameSession.state

      // Créer l'entité Game pour la persistance
      const gameStateAsRecord = gameState as unknown as Record<string, unknown>
      const gameStatePlayers =
        (gameState.players as unknown as Array<Record<string, unknown>>) ?? []
      const discardPile = (gameStateAsRecord.publicDiscards as Array<string>) ?? []
      const deckCount = Array.isArray(gameStateAsRecord.deck)
        ? gameStateAsRecord.deck.length
        : Number(gameStateAsRecord.deckCount ?? 0)

      const game = Game.create({
        uuid: gameSession.gameId,
        players: lobby.players,
        gameData: {
          currentRound: gameState.round,
          currentTurn: gameState.turn,
          deck: { remaining: deckCount },
          discardPile,
          eliminatedPlayers: gameStatePlayers
            .filter((p) => p.isEliminated === true)
            .map((p) => String(p.id)),
          playerHands: {},
        },
      })

      // Sauvegarder la partie
      await this.gameRepository.save(game)

      // Notifier que le jeu a commencé
      this.notificationService.notifyGameStarted(lobby.uuid, gameSession.gameId, {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
      })

      // Supprimer le lobby de la mémoire
      await this.lobbyRepository.delete(lobby.uuid)

      // Préparer la réponse avec l'état du jeu Love Letter
      const response: StartGameResponse = {
        game: {
          uuid: gameSession.gameId,
          status: 'in_progress',
          players: lobby.players.map((p) => ({ uuid: p.uuid, nickName: p.nickName })),
          gameState: {
            phase: gameState.phase,
            currentPlayerId: gameState.currentPlayerId,
            round: gameState.round,
            turn: gameState.turn,
            isFinished: gameState.isFinished,
            deckCount,
            discardPile: discardPile.map((cardType) => ({
              type: cardType,
              value: 0,
            })),
            players: gameStatePlayers.map((p) => ({
              id: String(p.id),
              name: String(p.name),
              isActive: Boolean(p.isActive),
              isProtected: Boolean(p.isProtected),
              isEliminated: Boolean(p.isEliminated),
              handCount: Array.isArray(p.hand) ? p.hand.length : 0,
            })),
          },
          startedAt: gameSession.createdAt,
        },
        lobbyDeleted: true,
      }

      return Result.ok(response)
    } catch (error) {
      return Result.fail(safeSystemError(error, 'start_game'))
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
