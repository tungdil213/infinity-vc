/**
 * Game Engine Service
 *
 * Encapsulates the LoveLetterEngine and provides game management functionality.
 * This service acts as a bridge between the domain use cases and the game engine.
 */
import {
  createLoveLetterEngine,
  type LoveLetterState,
  type LoveLetterAction,
  type LoveLetterActionType,
  LoveLetterActionTypes,
} from '../../games/love-letter/index.js'
import type { IPlayer, IPlayerView } from '@infinity.dev/game-engine/core'
import type { PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { Result } from '../../domain/shared/result.js'
import {
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
  constructor(
    private readonly sessionStore: GameSessionStore = new GameSessionStore(),
    private readonly eventPublisher: GameEngineEventPublisher = new GameEngineEventPublisher()
  ) {}

  /**
   * Create a new game session
   */
  createGame(lobbyId: string, players: PlayerInterface[]): Result<GameSession> {
    const engine = createLoveLetterEngine()

    // Convert PlayerInterface to IPlayer
    const gamePlayers: IPlayer[] = players.map((p) => ({
      id: p.uuid,
      name: p.nickName,
      isActive: true,
    }))

    const result = engine.initialize(gamePlayers)

    if (result.isFailure) {
      return Result.fail(result.error?.message || 'Failed to initialize game')
    }

    const session: GameSession = {
      gameId: result.value.gameId,
      lobbyId,
      engine,
      state: result.value,
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
  getPlayerView(gameId: string, playerId: string): IPlayerView<LoveLetterState> | null {
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
      actionType: LoveLetterActionTypes.DRAW_CARD as LoveLetterActionType,
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
      actionType: LoveLetterActionTypes.PLAY_CARD as LoveLetterActionType,
      payload: { cardType, targetPlayerId, guessedCard },
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

  private buildAction(request: GameActionRequest): LoveLetterAction {
    return {
      type: request.actionType,
      playerId: request.playerId,
      timestamp: new Date(),
      payload: {
        cardType: request.payload?.cardType as any,
        targetPlayerId: request.payload?.targetPlayerId,
        guessedCard: request.payload?.guessedCard as any,
      },
    }
  }
}

// Singleton instance
export const gameEngineService = new GameEngineService()
