import type { HttpContext } from '@adonisjs/core/http'
import { sseService } from './sse_service.js'
import { sseConnectionManager } from './connection_manager.js'

/**
 * HTTP controller for SSE endpoints
 *
 * Routes (see start/routes.ts):
 * - GET  /api/v1/sse/connect      → connect
 * - POST /api/v1/sse/subscribe    → subscribe
 * - POST /api/v1/sse/unsubscribe  → unsubscribe
 * - GET  /api/v1/sse/stats        → stats
 */
export default class SseHttpController {
  /**
   * Establish an SSE connection for the authenticated user
   */
  async connect({ auth, response }: HttpContext) {
    const user = auth.user
    const userId = (user as any)?.userUuid || (user as any)?.id?.toString() || 'anonymous'

    // Ensure SSE service is ready
    await sseService.initialize()

    // Register connection and let the response stream open
    sseConnectionManager.addConnection(userId, response)
    // Do not return any JSON body: connection stays open for SSE
  }

  /**
   * Subscribe an existing SSE connection to one or more channels
   * Body example:
   * { connectionId: string, lobbyUuid?: string, userUuid?: string, gameUuid?: string }
   */
  async subscribe({ request, response }: HttpContext) {
    const { connectionId, lobbyUuid, userUuid, gameUuid } = request.only([
      'connectionId',
      'lobbyUuid',
      'userUuid',
      'gameUuid',
    ])

    if (!connectionId) {
      return response.badRequest({ error: 'connectionId is required' })
    }

    const result: Record<string, boolean> = {}

    if (lobbyUuid) {
      result.lobby = sseService.subscribeToLobby(connectionId, lobbyUuid)
    }

    if (userUuid) {
      result.user = sseService.subscribeToUser(connectionId, userUuid)
    }

    if (gameUuid) {
      result.game = sseService.subscribeToGame(connectionId, gameUuid)
    }

    return response.ok({ success: true, ...result })
  }

  /**
   * Unsubscribe an existing SSE connection from one or more channels
   * Body example:
   * { connectionId: string, lobbyUuid?: string, userUuid?: string, gameUuid?: string }
   */
  async unsubscribe({ request, response }: HttpContext) {
    const { connectionId, lobbyUuid, userUuid, gameUuid } = request.only([
      'connectionId',
      'lobbyUuid',
      'userUuid',
      'gameUuid',
    ])

    if (!connectionId) {
      return response.badRequest({ error: 'connectionId is required' })
    }

    const result: Record<string, boolean> = {}

    if (lobbyUuid) {
      result.lobby = sseService.unsubscribeFromLobby(connectionId, lobbyUuid)
    }

    if (userUuid) {
      result.user = sseService.unsubscribeFromUser(connectionId, userUuid)
    }

    if (gameUuid) {
      result.game = sseService.unsubscribeFromGame(connectionId, gameUuid)
    }

    return response.ok({ success: true, ...result })
  }

  /**
   * Return SSE system statistics
   */
  async stats({ response }: HttpContext) {
    const stats = sseService.getStats()
    return response.ok(stats)
  }
}
