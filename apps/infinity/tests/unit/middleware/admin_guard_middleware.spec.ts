import { test } from '@japa/runner'
import AdminGuardMiddleware from '../../../app/middleware/admin_guard_middleware.js'

test.group('AdminGuardMiddleware', (group) => {
  const originalAdminEmails = process.env.ADMIN_EMAILS

  group.teardown(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails
  })

  test('returns 403 for non-admin player', async ({ assert }) => {
    process.env.ADMIN_EMAILS = ''
    const middleware = new AdminGuardMiddleware()
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
    assert.deepEqual(payload, { error: 'Admin access required' })
  })

  test('allows admin role', async ({ assert }) => {
    process.env.ADMIN_EMAILS = ''
    const middleware = new AdminGuardMiddleware()
    let called = false

    await middleware.handle(
      {
        auth: {
          user: {
            userUuid: 'user-2',
            email: 'admin@example.com',
            role: 'ADMIN',
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

  test('allows configured admin email fallback', async ({ assert }) => {
    process.env.ADMIN_EMAILS = 'legacy.admin@example.com'
    const middleware = new AdminGuardMiddleware()
    let called = false

    await middleware.handle(
      {
        auth: {
          user: {
            userUuid: 'user-3',
            email: 'legacy.admin@example.com',
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
