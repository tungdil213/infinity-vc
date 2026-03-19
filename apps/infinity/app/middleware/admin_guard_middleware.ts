import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import { isAdminEmail } from '#infrastructure/security/admin_access'
import { USER_ROLES, hasRequiredRole } from '#domain/value_objects/user_role'

export default class AdminGuardMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.status(401).json({ error: 'Unauthorized' })
    }

    const hasAdminRole = hasRequiredRole(user.role, USER_ROLES.ADMIN)
    const hasLegacyAdminEmail = isAdminEmail(user.email)

    if (!hasAdminRole && !hasLegacyAdminEmail) {
      logger.warn(
        {
          userUuid: user.userUuid,
          email: user.email,
          role: user.role,
          operation: 'admin_guard',
        },
        '[AdminGuard] Rejected non-admin access'
      )
      return ctx.response.status(403).json({ error: 'Admin access required' })
    }

    await next()
  }
}
