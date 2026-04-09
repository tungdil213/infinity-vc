import { test } from '@japa/runner'
import ModerationGuardMiddleware from '../../../app/middleware/moderation_guard_middleware.js'

test.group('ModerationGuardMiddleware', (group) => {
  const originalModeratorEmails = process.env.MODERATOR_EMAILS
  const originalAdminEmails = process.env.ADMIN_EMAILS

  group.teardown(() => {
    process.env.MODERATOR_EMAILS = originalModeratorEmails
    process.env.ADMIN_EMAILS = originalAdminEmails
  })

  test('returns 401 when user is not authenticated', async ({ assert }) => {
    const middleware = new ModerationGuardMiddleware()
    let called = false
    let statusCode: number | null = null
    let payload: unknown = null

    await middleware.handle(
      {
        auth: { user: null },
        response: {
          status(code: number) {
            statusCode = code
            return {
              json(body: unknown) {
                payload = body
              },
            }
          },
        },
      } as any,
      async () => {
        called = true
      }
    )

    assert.isFalse(called)
    assert.equal(statusCode, 401)
    assert.deepEqual(payload, { error: 'Unauthorized' })
  })

  test('returns 403 for plain player role', async ({ assert }) => {
    process.env.MODERATOR_EMAILS = ''
    process.env.ADMIN_EMAILS = ''

    const middleware = new ModerationGuardMiddleware()
    let called = false
    let statusCode: number | null = null
    let payload: unknown = null

    await middleware.handle(
      {
        auth: {
          user: {
            userUuid: 'user-1',
            email: 'player@example.com',
            role: 'PLAYER',
          },
        },
        response: {
          status(code: number) {
            statusCode = code
            return {
              json(body: unknown) {
                payload = body
              },
            }
          },
        },
      } as any,
      async () => {
        called = true
      }
    )

    assert.isFalse(called)
    assert.equal(statusCode, 403)
    assert.deepEqual(payload, { error: 'Moderator access required' })
  })

  test('allows moderator role', async ({ assert }) => {
    process.env.MODERATOR_EMAILS = ''
    process.env.ADMIN_EMAILS = ''

    const middleware = new ModerationGuardMiddleware()
    let called = false

    await middleware.handle(
      {
        auth: {
          user: {
            userUuid: 'user-2',
            email: 'moderator@example.com',
            role: 'MODERATOR',
          },
        },
        response: {
          status() {
            throw new Error('status should not be called')
          },
        },
      } as any,
      async () => {
        called = true
      }
    )

    assert.isTrue(called)
  })

  test('allows configured moderator email fallback', async ({ assert }) => {
    process.env.MODERATOR_EMAILS = 'trusted.mod@example.com'
    process.env.ADMIN_EMAILS = ''

    const middleware = new ModerationGuardMiddleware()
    let called = false

    await middleware.handle(
      {
        auth: {
          user: {
            userUuid: 'user-3',
            email: 'trusted.mod@example.com',
            role: 'PLAYER',
          },
        },
        response: {
          status() {
            throw new Error('status should not be called')
          },
        },
      } as any,
      async () => {
        called = true
      }
    )

    assert.isTrue(called)
  })
})
