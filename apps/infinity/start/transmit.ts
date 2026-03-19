import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'

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
    // User must be authenticated
    if (!ctx.auth.user) {
      return false
    }

    // TODO: Add explicit membership/access checks for private lobbies.
    // For now, authenticated users are allowed.
    console.log(`User ${ctx.auth.user.userUuid} accessing lobby ${lobbyUuid}`)
    return true
  }
)

// User notification channel
transmit.authorize<{ userUuid: string }>('users/:userUuid', (ctx: HttpContext, { userUuid }) => {
  // Users can only listen to their own notifications
  return ctx.auth.user?.userUuid === userUuid
})
