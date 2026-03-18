/**
 * Game Engine Service
 *
 * Encapsulates launcher-driven game engines and provides game management functionality.
 * This service acts as a bridge between the domain use cases and the game engine.
 */
import { type GameLauncher, RpsActionTypes } from '@infinity.dev/game-engine'
import type { IAction, IGameState, IPlayer, IPlayerView } from '@infinity.dev/game-engine/core'
import { Effect } from 'effect'
import type { PlayerInterface } from '#domain/interfaces/player_interface'
import { Result } from '#shared/result'
import type { GameRuntimePort } from '#application/services/game_runtime_port'
import { runEffectAsResult } from '#shared/effect_result'
import { getAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import {
  type GenericAction,
  type GameActionRequest,
  type GameActionResponse,
  type GameSession,
} from '#application/services/game_engine_types'
import { GameSessionStore } from '#application/services/game_session_store'
import { GameEngineEventPublisher } from '#application/services/game_engine_event_publisher'

export type {
  GameActionRequest,
  GameActionResponse,
  GameSession,
} from '#application/services/game_engine_types'

/**
 * Service for managing game sessions using the LoveLetterEngine
 */
export class GameEngineService implements GameRuntimePort {
  private static readonly GAME_TYPE_ALIASES: Record<string, string> = {
    'love-letter': 'love-letter-infinity-gauntlet',
  }

  constructor(
    private readonly sessionStore: GameSessionStore = new GameSessionStore(),
    private readonly eventPublisher: GameEngineEventPublisher = new GameEngineEventPublisher(),
    private readonly launcher: GameLauncher = getAppGameLauncher()
  ) {}

  /**
   * Create a new game session
   */
  async createGame(
    lobbyId: string,
    players: PlayerInterface[],
    gameType: string,
    gameSettings: Record<string, unknown> = {}
  ): Promise<Result<GameSession>> {
    const resolvedGameType = this.resolveGameType(gameType)
    const gamePlayers: IPlayer[] = players.map((player) => ({
      id: player.uuid,
      name: player.nickName,
      isActive: true,
    }))
    const launcher = this.launcher

    const createGameProgram = Effect.gen(function* () {
      const launchResult = launcher.launch({
        gameId: resolvedGameType,
        players: gamePlayers,
        settings: gameSettings,
      })

      if (launchResult.isFailure) {
        return yield* Effect.fail(launchResult.error?.message || 'Failed to launch game')
      }

      const startedResult = yield* Effect.tryPromise({
        try: () => launcher.startSession(launchResult.value),
        catch: () => 'Failed to start game session',
      })

      if (startedResult.isFailure) {
        return yield* Effect.fail(startedResult.error?.message || 'Failed to initialize game')
      }

      if (!startedResult.value.state) {
        return yield* Effect.fail('Game state is unavailable after session start')
      }

      return {
        gameId: startedResult.value.state.gameId,
        lobbyId,
        gameType: resolvedGameType,
        engine: startedResult.value.engine,
        state: startedResult.value.state,
        players: gamePlayers,
        createdAt: new Date(),
      } satisfies GameSession
    })

    const createdSessionResult = await runEffectAsResult(createGameProgram, 'create_game')
    if (createdSessionResult.isFailure) {
      return createdSessionResult
    }

    this.sessionStore.save(createdSessionResult.value)
    this.eventPublisher.publishGameStarted(
      createdSessionResult.value,
      players.map((player) => ({ uuid: player.uuid, nickName: player.nickName }))
    )

    return createdSessionResult
  }

  /**
   * Get a game session by ID
   */
  getSession(gameId: string): GameSession | undefined {
    return this.sessionStore.get(gameId)
  }

  /**
   * Get game state for a player (filtered view)
   */
  getPlayerView(gameId: string, playerId: string): IPlayerView<IGameState> | null {
    const session = this.sessionStore.get(gameId)
    if (!session) return null

    return session.engine.getPlayerView(session.state, playerId)
  }

  /**
   * Get available actions for a player
   */
  getAvailableActions(gameId: string, playerId: string): string[] {
    const session = this.sessionStore.get(gameId)
    if (!session) return []

    return session.engine.getAvailableActions(session.state, playerId)
  }

  /**
   * Execute a game action
   */
  executeAction(request: GameActionRequest): GameActionResponse {
    const session = this.sessionStore.get(request.gameId)
    if (!session) {
      return { success: false, error: 'Game not found' }
    }

    const action = this.buildAction(request)

    // Validate the action
    const validationResult = session.engine.validateAction(session.state, action)
    if (validationResult.isFailure) {
      return { success: false, error: validationResult.error?.message }
    }

    // Execute the action
    const executeResult = session.engine.executeAction(session.state, action)
    if (executeResult.isFailure) {
      return { success: false, error: executeResult.error?.message }
    }

    const nextState = executeResult.value.newState
    this.sessionStore.updateState(session.gameId, nextState)
    this.eventPublisher.publishActionEvents(session.gameId, executeResult.value.events)

    if (nextState.isFinished) {
      this.eventPublisher.publishGameFinished(session.gameId, nextState.winnerId)
    }

    return {
      success: true,
      newState: nextState,
      events: executeResult.value.events.map((e) => ({
        type: e.type,
        payload: e.payload,
      })),
    }
  }

  /**
   * Draw a card (convenience method)
   */
  drawCard(gameId: string, playerId: string): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: 'draw_card',
    })
  }

  /**
   * Play a card (convenience method)
   */
  playCard(
    gameId: string,
    playerId: string,
    cardType: string,
    targetPlayerId?: string,
    guessedCard?: string
  ): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: 'play_card',
      payload: { cardType, targetPlayerId, guessedCard },
    })
  }

  submitMove(gameId: string, playerId: string, move: string): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: RpsActionTypes.SUBMIT_MOVE,
      payload: { move },
    })
  }

  /**
   * End a game session
   */
  endGame(gameId: string): void {
    const session = this.sessionStore.delete(gameId)
    if (session) {
      this.eventPublisher.publishSessionEnded(gameId)
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): GameSession[] {
    return this.sessionStore.list()
  }

  /**
   * Get session by lobby ID
   */
  getSessionByLobby(lobbyId: string): GameSession | undefined {
    return this.sessionStore.getByLobbyId(lobbyId)
  }

  private buildAction(request: GameActionRequest): GenericAction {
    return {
      type: request.actionType,
      playerId: request.playerId,
      timestamp: new Date(),
      payload: (request.payload ?? {}) as IAction['payload'],
    } as GenericAction
  }

  private resolveGameType(gameType: string): string {
    const normalizedGameType = GameEngineService.GAME_TYPE_ALIASES[gameType]
    return normalizedGameType || gameType
  }
}

// Singleton instance
export const gameEngineService = new GameEngineService()
