import { test } from '@japa/runner'
import BusinessException from '#exceptions/business_exception'
import FriendPresenceController from '#controllers/friend_presence_controller'

function createResponseHarness() {
  const state = {
    body: null as unknown,
  }

  return {
    state,
    response: {
      json(payload: unknown) {
        state.body = payload
        return payload
      },
    },
  }
}

function createI18nHarness() {
  const translations: Record<string, string> = {
    'friends.errors.presenceFailed': 'Presence update failed safely.',
  }

  return {
    t(key: string) {
      return translations[key] ?? `translation missing: ${key}`
    },
  }
}

test.group('FriendPresenceController', () => {
  test('uses a generic public display name instead of the auth email fallback', async ({
    assert,
  }) => {
    let receivedArgs: Record<string, unknown> | null = null
    const controller = new FriendPresenceController(
      {} as any,
      {
        execute: async (args: Record<string, unknown>) => {
          receivedArgs = args

          return {
            isFailure: false,
            value: {
              friendUserUuid: 'friend-1',
              displayName: args.displayName,
              status: 'online',
              lobbyId: null,
              lobbyName: null,
              gameId: null,
              updatedAt: new Date('2026-04-10T10:00:00.000Z'),
            },
          }
        },
      } as any,
      {} as any
    )

    const harness = createResponseHarness()

    await controller.heartbeat({
      auth: {
        user: {
          userUuid: 'friend-1',
          fullName: '',
          email: 'private.friend@example.com',
        },
      },
      request: {
        validateUsing: async () => ({
          clientSessionId: 'session-1',
        }),
      },
      response: harness.response,
      i18n: createI18nHarness(),
    } as any)

    assert.isNotNull(receivedArgs)
    assert.equal(receivedArgs!.displayName, 'Unknown User')
    assert.notInclude(JSON.stringify(harness.state.body), 'private.friend@example.com')
  })

  test('sanitizes presence failures before throwing', async ({ assert }) => {
    const controller = new FriendPresenceController(
      {} as any,
      {
        execute: async () => ({
          isFailure: true,
          error: 'Presence failure for private.friend@example.com',
        }),
      } as any,
      {} as any
    )

    try {
      await controller.heartbeat({
        auth: {
          user: {
            userUuid: 'friend-1',
            fullName: 'Friend User',
          },
        },
        request: {
          validateUsing: async () => ({
            clientSessionId: 'session-1',
          }),
        },
        response: createResponseHarness().response,
        i18n: createI18nHarness(),
      } as any)

      assert.fail('Expected heartbeat to throw a BusinessException')
    } catch (error) {
      assert.instanceOf(error, BusinessException)
      assert.equal((error as BusinessException).message, 'Presence update failed safely.')
      assert.notInclude((error as BusinessException).message, 'private.friend@example.com')
    }
  })
})
