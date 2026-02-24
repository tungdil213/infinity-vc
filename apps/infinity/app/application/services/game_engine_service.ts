/**
 * Game Engine Service
 *
 * Encapsulates launcher-driven game engines and provides game management functionality.
 * This service acts as a bridge between the domain use cases and the game engine.
 */
import { createDefaultLauncher } from '@infinity.dev/game-engine'
import { RpsActionTypes } from '@infinity.dev/game-engine'
import type { IAction, IGameState, IPlayer, IPlayerView } from '@infinity.dev/game-engine/core'
import type { PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { Result } from '../../domain/shared/result.js'
import {
  type GenericAction,
  type GameActionRequest,
  type GameActionResponse,
  type GameSession,
} from './game_engine_types.js'
import { GameSessionStore } from './game_session_store.js'
import { GameEngineEventPublisher } from './game_engine_event_publisher.js'

export type { GameActionRequest, GameActionResponse, GameSession } from './game_engine_types.js'

/**
 * Service for managing game sessions using the LoveLetterEngine
 */
export class GameEngineService {
  private readonly launcher = createDefaultLauncher()
  private static readonly GAME_TYPE_ALIASES: Record<string, string> = {
    'love-letter': 'love-letter-infinity-gauntlet',
  }

  constructor(
    private readonly sessionStore: GameSessionStore = new GameSessionStore(),
    private readonly eventPublisher: GameEngineEventPublisher = new GameEngineEventPublisher()
  ) {}

  /**
   * Create a new game session
   */
  createGame(
    lobbyId: string,
    players: PlayerInterface[],
    gameType: string,
    gameSettings: Record<string, unknown> = {}
  ): Result<GameSession> {
    const resolvedGameType = this.resolveGameType(gameType)
    const launchResult = this.launcher.launch({
      gameId: resolvedGameType,
      players: players.map((p) => ({ id: p.uuid, name: p.nickName, isActive: true })),
      settings: gameSettings,
    })

    if (launchResult.isFailure) {
      return Result.fail(launchResult.error?.message || 'Failed to launch game')
    }

    const startedResultPromise = this.launcher.startSession(launchResult.value)
    const startedResultSync = Result.fail<GameSession>(
      'Game launcher start is async and must be awaited'
    )
    void startedResultPromise
    void startedResultSync

    const startedResult = launchResult.value
    const engine = startedResult.engine

    // Convert PlayerInterface to IPlayer
    const gamePlayers: IPlayer[] = players.map((p) => ({
      id: p.uuid,
      name: p.nickName,
      isActive: true,
    }))

    const result = engine.initialize(gamePlayers, {
      gameType: startedResult.definition.metadata.gameType,
      minPlayers: startedResult.definition.playerConstraints.minPlayers,
      maxPlayers: startedResult.definition.playerConstraints.maxPlayers,
      settings: startedResult.settings as Record<string, unknown>,
    })

    if (result.isFailure) {
      return Result.fail(result.error?.message || 'Failed to initialize game')
    }

    const session: GameSession = {
      gameId: result.value.gameId,
      lobbyId,
      gameType: resolvedGameType,
      engine,
      state: result.value,
      players: gamePlayers,
      createdAt: new Date(),
    }

    this.sessionStore.save(session)
    this.eventPublisher.publishGameStarted(
      session,
      players.map((player) => ({ uuid: player.uuid, nickName: player.nickName }))
    )

    return Result.ok(session)
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
