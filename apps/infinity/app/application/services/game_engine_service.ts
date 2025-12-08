/**
 * Game Engine Service
 *
 * Encapsulates the LoveLetterEngine and provides game management functionality.
 * This service acts as a bridge between the domain use cases and the game engine.
 */
import {
  LoveLetterEngine,
  createLoveLetterEngine,
  type ILoveLetterState,
  type ILoveLetterAction,
  type LoveLetterActionType,
  LoveLetterActionTypes,
} from '../../games/love-letter/index.js'
import type { IPlayer, IPlayerView } from '@tyfo.dev/game-engine/core'
import type { PlayerInterface } from '../../domain/interfaces/player_interface.js'
import { eventBus } from '../../infrastructure/events/event_bus.js'

/**
 * Active game session
 */
export interface GameSession {
  gameId: string
  lobbyId: string
  engine: LoveLetterEngine
  state: ILoveLetterState
  createdAt: Date
}

/**
 * Game action request
 */
export interface GameActionRequest {
  gameId: string
  playerId: string
  actionType: LoveLetterActionType
  payload?: {
    cardType?: string
    targetPlayerId?: string
    guessedCard?: string
  }
}

/**
 * Game action response
 */
export interface GameActionResponse {
  success: boolean
  newState?: ILoveLetterState
  error?: string
  events?: Array<{
    type: string
    payload: unknown
  }>
}

/**
 * Service for managing game sessions using the LoveLetterEngine
 */
export class GameEngineService {
  private sessions: Map<string, GameSession> = new Map()

  /**
   * Create a new game session
   */
  createGame(lobbyId: string, players: PlayerInterface[]): GameSession {
    const engine = createLoveLetterEngine()

    // Convert PlayerInterface to IPlayer
    const gamePlayers: IPlayer[] = players.map((p) => ({
      id: p.uuid,
      name: p.nickName,
      isActive: true,
    }))

    const result = engine.initialize(gamePlayers)

    if (result.isFailure) {
      throw new Error(result.error?.message || 'Failed to initialize game')
    }

    const session: GameSession = {
      gameId: result.value.gameId,
      lobbyId,
      engine,
      state: result.value,
      createdAt: new Date(),
    }

    this.sessions.set(session.gameId, session)

    // Publish game started event
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'game.started',
      timestamp: new Date(),
      payload: {
        gameId: session.gameId,
        lobbyId,
        players: players.map((p) => ({ uuid: p.uuid, nickName: p.nickName })),
      },
    })

    return session
  }

  /**
   * Get a game session by ID
   */
  getSession(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId)
  }

  /**
   * Get game state for a player (filtered view)
   */
  getPlayerView(gameId: string, playerId: string): IPlayerView<ILoveLetterState> | null {
    const session = this.sessions.get(gameId)
    if (!session) return null

    return session.engine.getPlayerView(session.state, playerId)
  }

  /**
   * Get available actions for a player
   */
  getAvailableActions(gameId: string, playerId: string): string[] {
    const session = this.sessions.get(gameId)
    if (!session) return []

    return session.engine.getAvailableActions(session.state, playerId)
  }

  /**
   * Execute a game action
   */
  executeAction(request: GameActionRequest): GameActionResponse {
    const session = this.sessions.get(request.gameId)
    if (!session) {
      return { success: false, error: 'Game not found' }
    }

    // Build the action
    const action: ILoveLetterAction = {
      type: request.actionType,
      playerId: request.playerId,
      timestamp: new Date(),
      payload: {
        cardType: request.payload?.cardType as any,
        targetPlayerId: request.payload?.targetPlayerId,
        guessedCard: request.payload?.guessedCard as any,
      },
    }

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

    // Update session state
    session.state = executeResult.value.newState

    // Publish events
    for (const event of executeResult.value.events) {
      const eventPayload =
        typeof event.payload === 'object' && event.payload !== null
          ? { gameId: session.gameId, ...(event.payload as Record<string, unknown>) }
          : { gameId: session.gameId, data: event.payload }

      eventBus.publish({
        id: crypto.randomUUID(),
        type: `game.${event.type}`,
        timestamp: new Date(),
        payload: eventPayload,
      })
    }

    // Check if game is finished
    if (session.state.isFinished) {
      eventBus.publish({
        id: crypto.randomUUID(),
        type: 'game.finished',
        timestamp: new Date(),
        payload: {
          gameId: session.gameId,
          winnerId: session.state.winnerId,
        },
      })
    }

    return {
      success: true,
      newState: session.state,
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
      actionType: LoveLetterActionTypes.DRAW_CARD,
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
      actionType: LoveLetterActionTypes.PLAY_CARD,
      payload: { cardType, targetPlayerId, guessedCard },
    })
  }

  /**
   * End a game session
   */
  endGame(gameId: string): void {
    const session = this.sessions.get(gameId)
    if (session) {
      this.sessions.delete(gameId)

      eventBus.publish({
        id: crypto.randomUUID(),
        type: 'game.session_ended',
        timestamp: new Date(),
        payload: { gameId },
      })
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): GameSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get session by lobby ID
   */
  getSessionByLobby(lobbyId: string): GameSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.lobbyId === lobbyId) {
        return session
      }
    }
    return undefined
  }
}

// Singleton instance
export const gameEngineService = new GameEngineService()
