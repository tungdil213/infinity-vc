import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import { isModeratorEmail } from '#infrastructure/security/admin_access'
import { canModerateLobbies } from '#domain/value_objects/user_role'

export default class ModerationGuardMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.status(401).json({ error: 'Unauthorized' })
    }

    const canModerate = canModerateLobbies(user.role) || isModeratorEmail(user.email)
    if (!canModerate) {
      logger.warn(
        {
          userUuid: user.userUuid,
          email: user.email,
          role: user.role,
          operation: 'moderation_guard',
        },
        '[ModerationGuard] Rejected non-moderator access'
      )
      return ctx.response.status(403).json({ error: 'Moderator access required' })
    }

    await next()
  }
}
