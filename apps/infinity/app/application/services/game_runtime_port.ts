import type { IGameState, IPlayerView } from '@infinity.dev/game-engine/core'
import type { Result } from '#shared/result'
import type { PlayerInterface } from '#domain/interfaces/player_interface'
import type {
  GameActionRequest,
  GameActionResponse,
  GameSession,
} from '#application/services/game_engine_types'

export interface GameRuntimePort {
  createGame(
    lobbyId: string,
    players: PlayerInterface[],
    gameType: string,
    gameSettings?: Record<string, unknown>
  ): Promise<Result<GameSession>>

  getSession(gameId: string): GameSession | undefined

  getPlayerView(gameId: string, playerId: string): IPlayerView<IGameState> | null

  getAvailableActions(gameId: string, playerId: string): string[]

  executeAction(request: GameActionRequest): GameActionResponse

  endGame(gameId: string): void

  getActiveSessions(): GameSession[]

  getSessionByLobby(lobbyId: string): GameSession | undefined
}
