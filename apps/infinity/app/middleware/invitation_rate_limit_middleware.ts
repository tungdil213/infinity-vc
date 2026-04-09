import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

type Entry = {
  count: number
  firstAttemptAtMs: number
  blockedUntilMs: number | null
}

type PersistedEntryRow = {
  identifier: string
  attempt_count: number | string
  first_attempt_at_ms: number | string
  blocked_until_ms: number | string | null
}

const fallbackAttempts = new Map<string, Entry>()

const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60_000
const BLOCK_MS = 10 * 60_000

export default class InvitationRateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const identifier = this.buildIdentifier(ctx)
    const now = Date.now()

    const persistentEntry = await this.loadPersistentEntry(identifier, now)
    const usingFallback = !persistentEntry
    const entry = persistentEntry ?? this.loadFallbackEntry(identifier, now)

    if (entry.blockedUntilMs && now < entry.blockedUntilMs) {
      return this.respondRateLimited(ctx, Math.ceil((entry.blockedUntilMs - now) / 1000))
    }

    if (now - entry.firstAttemptAtMs > WINDOW_MS) {
      entry.count = 0
      entry.firstAttemptAtMs = now
      entry.blockedUntilMs = null
    }

    entry.count += 1

    if (entry.count > MAX_ATTEMPTS) {
      entry.blockedUntilMs = now + BLOCK_MS
      await this.persistEntry(identifier, entry, usingFallback)
      return this.respondRateLimited(ctx, Math.ceil(BLOCK_MS / 1000))
    }

    await this.persistEntry(identifier, entry, usingFallback)

    return next()
  }

  private buildIdentifier(ctx: HttpContext): string {
    const ip = ctx.request.ip() || 'unknown'
    const invitationCode = ctx.request.input('invitationCode')
    const normalizedCode =
      typeof invitationCode === 'string' && invitationCode.trim().length > 0
        ? invitationCode.trim().toUpperCase()
        : 'unknown-code'

    const scope = ctx.request.url().includes('validate-invitation') ? 'validate' : 'register'
    return `${scope}:${ip}:${normalizedCode}`
  }

  private loadFallbackEntry(identifier: string, now: number): Entry {
    const existing = fallbackAttempts.get(identifier)
    if (existing) {
      return existing
    }

    const created: Entry = {
      count: 0,
      firstAttemptAtMs: now,
      blockedUntilMs: null,
    }
    fallbackAttempts.set(identifier, created)
    return created
  }

  private async loadPersistentEntry(identifier: string, now: number): Promise<Entry | null> {
    try {
      const row = (await db
        .from('invitation_rate_limits')
        .where('identifier', identifier)
        .first()) as PersistedEntryRow | null

      if (row) {
        return this.rowToEntry(row, now)
      }

      await db.table('invitation_rate_limits').insert({
        identifier,
        attempt_count: 0,
        first_attempt_at_ms: now,
        blocked_until_ms: null,
        created_at: new Date(),
        updated_at: new Date(),
      })

      return {
        count: 0,
        firstAttemptAtMs: now,
        blockedUntilMs: null,
      }
    } catch (error) {
      logger.warn(
        {
          operation: 'invitation_rate_limit_load',
          reason: error instanceof Error ? error.message : 'unknown',
        },
        'Invitation rate-limit persistence unavailable, falling back to in-memory store'
      )
      return null
    }
  }

  private async persistEntry(identifier: string, entry: Entry, usingFallback: boolean) {
    if (usingFallback) {
      fallbackAttempts.set(identifier, entry)
      return
    }

    try {
      await db.from('invitation_rate_limits').where('identifier', identifier).update({
        attempt_count: entry.count,
        first_attempt_at_ms: entry.firstAttemptAtMs,
        blocked_until_ms: entry.blockedUntilMs,
        updated_at: new Date(),
      })
    } catch (error) {
      logger.warn(
        {
          operation: 'invitation_rate_limit_persist',
          reason: error instanceof Error ? error.message : 'unknown',
        },
        'Failed to persist invitation rate-limit state'
      )
      fallbackAttempts.set(identifier, entry)
    }
  }

  private respondRateLimited(ctx: HttpContext, retryAfterSeconds: number) {
    ctx.response.header('Retry-After', String(retryAfterSeconds))

    if (ctx.request.accepts(['html'])) {
      ctx.session.flash(
        'error',
        this.translate(
          ctx,
          'http.rateLimit.invitationRetryInSeconds',
          `Too many invitation attempts. Try again in ${retryAfterSeconds} seconds.`,
          { seconds: retryAfterSeconds }
        )
      )
      return ctx.response.redirect().back()
    }

    return ctx.response.status(429).json({
      error: this.translate(
        ctx,
        'http.rateLimit.invitationTryLater',
        'Too many invitation attempts. Please try again later.'
      ),
      retryAfter: retryAfterSeconds,
    })
  }

  private translate(
    ctx: HttpContext,
    key: string,
    fallback: string,
    data?: Record<string, string | number>
  ): string {
    try {
      const translated = ctx.i18n?.t(key, data)
      if (typeof translated === 'string' && translated.length > 0) {
        return translated
      }
    } catch {
      // Ignore i18n failures and return fallback text
    }

    return fallback
  }

  private rowToEntry(row: PersistedEntryRow, now: number): Entry {
    const firstAttemptAtMs = this.toNumber(row.first_attempt_at_ms, now)
    const blockedUntilMs =
      row.blocked_until_ms === null ? null : this.toNumber(row.blocked_until_ms, null)

    return {
      count: this.toNumber(row.attempt_count, 0),
      firstAttemptAtMs,
      blockedUntilMs,
    }
  }

  private toNumber(rawValue: unknown, fallback: number): number
  private toNumber(rawValue: unknown, fallback: null): number | null
  private toNumber(rawValue: unknown, fallback: number | null): number | null {
    const value = Number(rawValue)
    if (Number.isFinite(value)) {
      return value
    }

    return fallback
  }
}
