import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import { isModeratorEmail } from '#infrastructure/security/admin_access'
import { canModerateLobbies } from '#domain/value_objects/user_role'

export default class ModerationGuardMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.status(401).json({
        error: this.translate(ctx, 'http.errors.unauthorized', 'Unauthorized'),
      })
    }

    const canModerate = canModerateLobbies(user.role) || isModeratorEmail(user.email)
    if (!canModerate) {
      const requestId = typeof ctx.request?.id === 'function' ? ctx.request.id() : undefined
      logger.warn(
        {
          role: user.role,
          operation: 'moderation_guard',
          requestId,
        },
        '[ModerationGuard] Rejected non-moderator access'
      )
      return ctx.response.status(403).json({
        error: this.translate(ctx, 'http.access.moderatorRequired', 'Moderator access required'),
      })
    }

    await next()
  }

  private translate(ctx: HttpContext, key: string, fallback: string): string {
    try {
      const translated = ctx.i18n?.t(key)
      if (typeof translated === 'string' && translated.length > 0) {
        return translated
      }
    } catch {
      // Ignore i18n lookup errors and use fallback.
    }

    return fallback
  }
}
