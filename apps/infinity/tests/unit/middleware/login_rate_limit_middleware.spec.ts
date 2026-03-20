import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import LoginRateLimitMiddleware from '../../../app/middleware/login_rate_limit_middleware.js'

type JsonContextState = {
  statusCode: number | null
  payload: Record<string, unknown> | null
  headers: Record<string, string>
}

function createJsonContext(email: string, ip = '127.0.0.1') {
  const state: JsonContextState = {
    statusCode: null,
    payload: null,
    headers: {},
  }

  const ctx = {
    request: {
      ip: () => ip,
      input: (key: string) => {
        if (key === 'email') {
          return email
        }
        return undefined
      },
      accepts: () => null,
    },
    response: {
      header(name: string, value: string) {
        state.headers[name] = value
        return this
      },
      status(code: number) {
        state.statusCode = code
        return {
          json(payload: Record<string, unknown>) {
            state.payload = payload
            return payload
          },
        }
      },
      redirect() {
        return {
          back() {
            return null
          },
        }
      },
    },
    session: {
      flash() {},
    },
  } as any

  return { ctx, state }
}

test.group('LoginRateLimitMiddleware', () => {
  test('blocks the sixth failed attempt and returns retry metadata', async ({ assert }) => {
    const middleware = new LoginRateLimitMiddleware()
    const originalFrom = (db as any).from
    const originalTable = (db as any).table

    ;(db as any).from = () => {
      throw new Error('db unavailable')
    }
    ;(db as any).table = () => {
      throw new Error('db unavailable')
    }

    try {
      const identifierEmail = `user-${Date.now()}@example.com`
      let nextCalls = 0

      for (let attempt = 1; attempt <= 5; attempt++) {
        const { ctx } = createJsonContext(identifierEmail)
        await middleware.handle(ctx, async () => {
          nextCalls += 1
        })
      }

      const blockedAttempt = createJsonContext(identifierEmail)
      await middleware.handle(blockedAttempt.ctx, async () => {
        nextCalls += 1
      })

      assert.equal(nextCalls, 5)
      assert.equal(blockedAttempt.state.statusCode, 429)
      assert.equal(blockedAttempt.state.headers['Retry-After'], '300')
      assert.deepEqual(blockedAttempt.state.payload, {
        error: 'Too many login attempts. Please try again later.',
        retryAfter: 300,
      })
    } finally {
      ;(db as any).from = originalFrom
      ;(db as any).table = originalTable
    }
  })

  test('normalizes email casing when computing the rate-limit identifier', async ({ assert }) => {
    const middleware = new LoginRateLimitMiddleware()
    const originalFrom = (db as any).from
    const originalTable = (db as any).table

    ;(db as any).from = () => {
      throw new Error('db unavailable')
    }
    ;(db as any).table = () => {
      throw new Error('db unavailable')
    }

    try {
      const email = `case-${Date.now()}@example.com`
      const firstVariant = ` ${email.toUpperCase()} `
      const secondVariant = email.toLowerCase()
      let nextCalls = 0

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { ctx } = createJsonContext(firstVariant)
        await middleware.handle(ctx, async () => {
          nextCalls += 1
        })
      }

      for (let attempt = 1; attempt <= 2; attempt++) {
        const { ctx } = createJsonContext(secondVariant)
        await middleware.handle(ctx, async () => {
          nextCalls += 1
        })
      }

      const blockedAttempt = createJsonContext(secondVariant)
      await middleware.handle(blockedAttempt.ctx, async () => {
        nextCalls += 1
      })

      assert.equal(nextCalls, 5)
      assert.equal(blockedAttempt.state.statusCode, 429)
      assert.equal(blockedAttempt.state.headers['Retry-After'], '300')
    } finally {
      ;(db as any).from = originalFrom
      ;(db as any).table = originalTable
    }
  })
})
