import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import { isAdminEmail } from '#infrastructure/security/admin_access'

export default class AdminGuardMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.status(401).json({ error: 'Unauthorized' })
    }

    if (!isAdminEmail(user.email)) {
      logger.warn(
        {
          userUuid: user.userUuid,
          email: user.email,
          operation: 'admin_guard',
        },
        '[AdminGuard] Rejected non-admin access'
      )
      return ctx.response.status(403).json({ error: 'Admin access required' })
    }

    await next()
  }
}
