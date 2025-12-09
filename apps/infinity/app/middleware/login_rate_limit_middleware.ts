import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type Entry = {
  count: number
  firstAttemptAt: number
  blockedUntil: number | null
}

const attempts = new Map<string, Entry>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000
const BLOCK_MS = 5 * 60_000

export default class LoginRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const ip = ctx.request.ip() || 'unknown'
    const now = Date.now()

    let entry = attempts.get(ip)
    if (!entry) {
      entry = { count: 0, firstAttemptAt: now, blockedUntil: null }
      attempts.set(ip, entry)
    }

    if (entry.blockedUntil && now < entry.blockedUntil) {
      const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000)

      if (ctx.request.accepts(['html'])) {
        ctx.session.flash(
          'error',
          `Too many login attempts. Try again in ${remainingSeconds} seconds.`
        )
        return ctx.response.redirect().back()
      }

      return ctx.response.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: remainingSeconds,
      })
    }

    if (now - entry.firstAttemptAt > WINDOW_MS) {
      entry.count = 0
      entry.firstAttemptAt = now
      entry.blockedUntil = null
    }

    entry.count += 1

    if (entry.count > MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_MS

      if (ctx.request.accepts(['html'])) {
        ctx.session.flash('error', 'Too many login attempts. Please try again later.')
        return ctx.response.redirect().back()
      }

      return ctx.response.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil(BLOCK_MS / 1000),
      })
    }

    attempts.set(ip, entry)

    return next()
  }
}
