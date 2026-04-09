import { createHmac } from 'node:crypto'
import { test } from '@japa/runner'
import env from '#start/env'
import { computeInvitationCodeDigest } from '#infrastructure/security/invitation_code_security'

test.group('invitation_code_security', (group) => {
  const originalGet = env.get.bind(env)

  group.each.teardown(() => {
    ;(env as any).get = originalGet
  })

  test('falls back to APP_KEY outside production when INVITATION_CODE_SECRET is not set', ({
    assert,
  }) => {
    ;(env as any).get = (key: string) => {
      if (key === 'NODE_ENV') {
        return 'test'
      }
      if (key === 'APP_KEY') {
        return 'app-key'
      }
      if (key === 'INVITATION_CODE_SECRET') {
        return undefined
      }
      return originalGet(key as any)
    }

    const digest = computeInvitationCodeDigest('abcd-efgh-ijkl')
    const expectedDigest = createHmac('sha256', 'app-key').update('ABCDEFGHIJKL').digest('hex')

    assert.equal(digest, expectedDigest)
  })

  test('requires INVITATION_CODE_SECRET in production', ({ assert }) => {
    ;(env as any).get = (key: string) => {
      if (key === 'NODE_ENV') {
        return 'production'
      }
      if (key === 'APP_KEY') {
        return 'app-key'
      }
      if (key === 'INVITATION_CODE_SECRET') {
        return undefined
      }
      return originalGet(key as any)
    }

    assert.throws(
      () => computeInvitationCodeDigest('abcd-efgh-ijkl'),
      /INVITATION_CODE_SECRET is required in production/
    )
  })

  test('uses the dedicated invitation secret when it is configured', ({ assert }) => {
    ;(env as any).get = (key: string) => {
      if (key === 'NODE_ENV') {
        return 'production'
      }
      if (key === 'APP_KEY') {
        return 'app-key'
      }
      if (key === 'INVITATION_CODE_SECRET') {
        return 'invitation-secret'
      }
      return originalGet(key as any)
    }

    const digest = computeInvitationCodeDigest('abcd-efgh-ijkl')
    const expectedDigest = createHmac('sha256', 'invitation-secret')
      .update('ABCDEFGHIJKL')
      .digest('hex')

    assert.equal(digest, expectedDigest)
  })
})
