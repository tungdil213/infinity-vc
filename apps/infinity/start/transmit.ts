import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { HybridLobbyService } from '#application/services/hybrid_lobby_service'
import { canModerateLobbies } from '#domain/value_objects/user_role'

/**
 * Authorization rules for Transmit channels
 */

// Global channel for lobby list updates
transmit.authorize('lobbies', (ctx: HttpContext) => {
  // All authenticated users can view lobby list updates
  return !!ctx.auth.user
})

// Channel scoped to a specific lobby
transmit.authorize<{ lobbyUuid: string }>(
  'lobbies/:lobbyUuid',
  async (ctx: HttpContext, { lobbyUuid }) => {
    const user = ctx.auth.user
    if (!user) {
      return false
    }

    if (canModerateLobbies(user.role)) {
      return true
    }

    try {
      const lobbyRepository = await app.container.make(HybridLobbyService)
      const lobby = await lobbyRepository.findByUuid(lobbyUuid)

      if (!lobby) {
        return false
      }

      if (!lobby.isPrivate) {
        return true
      }

      return lobby.hasPlayer(user.userUuid)
    } catch (error) {
      logger.warn(
        {
          channel: 'lobbies/:lobbyUuid',
          reason: error instanceof Error ? error.message : 'unknown_error',
        },
        '[Transmit] Failed to verify lobby channel authorization'
      )
      return false
    }
  }
)

// User notification channel
transmit.authorize<{ userUuid: string }>('users/:userUuid', (ctx: HttpContext, { userUuid }) => {
  // Users can only listen to their own notifications
  return ctx.auth.user?.userUuid === userUuid
})
