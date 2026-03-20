import { Result } from '@infinity.dev/lobby-domain/shared'
import type { PlayerInterface } from '@infinity.dev/lobby-domain/interfaces'
import type { LobbyRepository, GameRepository } from '../repositories/index.js'
import type { GameRuntimePort, LobbyNotifier } from '../services/index.js'
import { safeSystemError } from '../shared/error_sanitizer.js'

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

export interface PersistedGameData {
  currentRound: number
  currentTurn: number
  deck: {
    remaining: number
  }
  discardPile: string[]
  eliminatedPlayers: string[]
  playerHands: Record<string, unknown[]>
  runtime: {
    gameType: string
    lobbyId: string
    settings: Record<string, unknown>
    engineState: Record<string, unknown>
    replayTimeline: unknown[]
    persistedAt: string
    runtimeStatus: 'HOT' | 'RESTORED'
  }
}

export interface PersistedGameInput {
  uuid: string
  players: PlayerInterface[]
  gameData: PersistedGameData
}

export type PersistedGameFactory = (input: PersistedGameInput) => unknown

const defaultPersistedGameFactory: PersistedGameFactory = (input) => {
  const startedAt = new Date()

  return {
    uuid: input.uuid,
    players: input.players,
    gameData: input.gameData,
    toJSON() {
      return {
        uuid: input.uuid,
        status: 'IN_PROGRESS',
        players: input.players,
        gameData: input.gameData,
        startedAt,
        finishedAt: undefined,
        duration: 0,
      }
    },
  }
}

export class StartGameUseCase {
  constructor(
    private lobbyRepository: LobbyRepository,
    private gameRepository: GameRepository,
    private notificationService: LobbyNotifier,
    private gameRuntime: GameRuntimePort,
    private createPersistedGame: PersistedGameFactory = defaultPersistedGameFactory
  ) {}

  async execute(request: StartGameRequest): Promise<Result<StartGameResponse>> {
    try {
      const validationResult = this.validateRequest(request)
      if (validationResult.isFailure) {
        return Result.fail<StartGameResponse>(validationResult.error)
      }

      const lobby = await this.lobbyRepository.findByUuidOrFail(request.lobbyUuid)

      const requestingPlayer = lobby.players.find((player) => player.uuid === request.userUuid)
      if (!requestingPlayer || requestingPlayer.uuid !== lobby.createdBy) {
        return Result.fail('Only the lobby creator can start the game')
      }

      if (!lobby.canStart) {
        return Result.fail('Lobby is not ready to start a game')
      }

      const gameResult = lobby.startGame() as { isFailure?: boolean; error?: string }
      if (gameResult.isFailure) {
        return Result.fail(gameResult.error || 'Failed to start game')
      }

      await this.lobbyRepository.save(lobby)

      const resolvedGameType = lobby.gameType || 'love-letter-infinity-gauntlet'

      const gameSessionResult = await this.gameRuntime.createGame(
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

      const gameStateAsRecord = gameState as unknown as Record<string, unknown>
      const gameStatePlayers =
        ((gameState.players ?? []) as unknown as Array<Record<string, unknown>>) ?? []
      const discardPile = (gameStateAsRecord.publicDiscards as Array<string>) ?? []
      const deckCount = Array.isArray(gameStateAsRecord.deck)
        ? gameStateAsRecord.deck.length
        : Number(gameStateAsRecord.deckCount ?? 0)
      const runtimeSettings =
        (gameStateAsRecord.settings as Record<string, unknown>) ?? lobby.gameSettings ?? {}

      const gameToPersist = this.createPersistedGame({
        uuid: gameSession.gameId,
        players: lobby.players,
        gameData: {
          currentRound: Number(gameState.round ?? 0),
          currentTurn: Number(gameState.turn ?? 0),
          deck: { remaining: deckCount },
          discardPile,
          eliminatedPlayers: gameStatePlayers
            .filter((player) => player.isEliminated === true)
            .map((player) => String(player.id)),
          playerHands: {},
          runtime: {
            gameType: resolvedGameType,
            lobbyId: lobby.uuid,
            settings: runtimeSettings,
            engineState: gameStateAsRecord,
            replayTimeline: gameSession.timeline ?? [],
            persistedAt: new Date().toISOString(),
            runtimeStatus: 'HOT',
          },
        },
      })

      await this.gameRepository.save(gameToPersist)

      await this.notificationService.notifyGameStarted?.(lobby.uuid, gameSession.gameId, {
        uuid: lobby.uuid,
        name: lobby.name,
        status: lobby.status,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        players: lobby.players,
        creator: lobby.creator,
      })

      await this.lobbyRepository.delete(lobby.uuid)

      const response: StartGameResponse = {
        game: {
          uuid: gameSession.gameId,
          status: 'in_progress',
          players: lobby.players.map((player) => ({
            uuid: player.uuid,
            nickName: player.nickName,
          })),
          gameState: {
            phase: String(gameState.phase ?? 'unknown'),
            currentPlayerId: (gameState.currentPlayerId ?? null) as string | null,
            round: Number(gameState.round ?? 0),
            turn: Number(gameState.turn ?? 0),
            isFinished: Boolean(gameState.isFinished),
            deckCount,
            discardPile: discardPile.map((cardType) => ({
              type: cardType,
              value: 0,
            })),
            players: gameStatePlayers.map((player) => ({
              id: String(player.id),
              name: String(player.name),
              isActive: Boolean(player.isActive),
              isProtected: Boolean(player.isProtected),
              isEliminated: Boolean(player.isEliminated),
              handCount: Array.isArray(player.hand) ? player.hand.length : 0,
            })),
          },
          startedAt: gameSession.createdAt,
        },
        lobbyDeleted: true,
      }

      return Result.ok(response)
    } catch (error) {
      return Result.fail(safeSystemError(error))
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
