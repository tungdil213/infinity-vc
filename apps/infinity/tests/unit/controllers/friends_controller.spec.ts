import { test } from '@japa/runner'
import FriendsController from '#controllers/friends_controller'
import BusinessException from '#exceptions/business_exception'

function createController(overrides?: {
  overview?: any
  search?: any
  sendResult?: { isFailure: boolean; error?: string }
}) {
  return new FriendsController(
    {
      execute: async () =>
        overrides?.overview ?? {
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
        },
    } as any,
    {
      execute: async () =>
        overrides?.search ?? {
          users: [],
        },
    } as any,
    {
      execute: async () =>
        overrides?.sendResult ?? {
          isFailure: false,
        },
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  )
}

function createI18nHarness() {
  const translations: Record<string, string> = {
    'friends.errors.actionFailed': 'Friend action failed safely.',
    'friends.errors.adminSenderRequired': 'Only admins can send friend requests.',
    'friends.errors.adminRecipientBlocked': 'You cannot send a friend request to an administrator.',
  }

  return {
    t(key: string) {
      return translations[key] ?? `translation missing: ${key}`
    },
  }
}

test.group('FriendsController', () => {
  test('renders social page props without exposing friend emails', async ({ assert }) => {
    const controller = createController({
      overview: {
        friends: [
          {
            uuid: 'friendship-1',
            userUuid: 'viewer-1',
            friendUserUuid: 'friend-1',
            friendDisplayName: 'Friend User',
            createdAt: new Date('2026-04-10T09:00:00.000Z'),
          },
        ],
        incomingRequests: [
          {
            uuid: 'request-1',
            requesterUserUuid: 'friend-2',
            requesterDisplayName: 'Incoming User',
            recipientUserUuid: 'viewer-1',
            recipientDisplayName: 'Viewer User',
            status: 'pending',
            createdAt: new Date('2026-04-10T09:05:00.000Z'),
            respondedAt: null,
          },
        ],
        outgoingRequests: [
          {
            uuid: 'request-2',
            requesterUserUuid: 'viewer-1',
            requesterDisplayName: 'Viewer User',
            recipientUserUuid: 'friend-3',
            recipientDisplayName: 'Outgoing User',
            status: 'pending',
            createdAt: new Date('2026-04-10T09:10:00.000Z'),
            respondedAt: null,
          },
        ],
      },
      search: {
        users: [
          {
            userUuid: 'friend-4',
            displayName: 'ShadowFox',
            isFriend: false,
            hasIncomingRequest: false,
            hasOutgoingRequest: false,
            canReceiveFriendRequests: true,
          },
        ],
      },
    })

    let render: { component: string; props: Record<string, any> } | null = null

    await controller.index({
      inertia: {
        render(component: string, props: Record<string, any>) {
          render = { component, props }
          return render
        },
      },
      auth: {
        user: {
          userUuid: 'viewer-1',
          fullName: 'Viewer User',
          email: 'viewer@example.com',
          normalizedRole: 'PLAYER',
        },
      },
      request: {
        input(key: string) {
          return key === 'q' ? 'shadow' : undefined
        },
      },
    } as any)

    assert.isNotNull(render)
    assert.equal(render!.component, 'friends')
    assert.equal(render!.props.searchResults[0].displayName, 'ShadowFox')
    assert.isTrue(render!.props.searchResults[0].canReceiveFriendRequests)
    assert.notProperty(render!.props.searchResults[0], 'email')
    assert.notProperty(render!.props.friends[0], 'friendEmail')
    assert.notProperty(render!.props.incomingRequests[0], 'requesterEmail')
    assert.notInclude(
      JSON.stringify({
        friends: render!.props.friends,
        incomingRequests: render!.props.incomingRequests,
        outgoingRequests: render!.props.outgoingRequests,
        searchResults: render!.props.searchResults,
      }),
      '@example.com'
    )
  })

  test('sanitizes unexpected friend action errors before throwing', async ({ assert }) => {
    const controller = createController({
      sendResult: {
        isFailure: true,
        error: 'Unexpected friend lookup failure for leaked@example.com',
      },
    })

    try {
      await controller.sendRequest({
        auth: {
          user: {
            userUuid: 'viewer-1',
          },
        },
        request: {
          validateUsing: async () => ({
            recipientUserUuid: 'friend-1',
          }),
        },
        response: {
          redirect() {
            return {
              toRoute() {},
            }
          },
        },
        i18n: createI18nHarness(),
      } as any)

      assert.fail('Expected sendRequest to throw a BusinessException')
    } catch (error) {
      assert.instanceOf(error, BusinessException)
      assert.equal((error as BusinessException).message, 'Friend action failed safely.')
      assert.equal(
        (error as BusinessException).metadata.userMessage,
        'Friend action failed safely.'
      )
      assert.notInclude((error as BusinessException).message, 'leaked@example.com')
    }
  })

  test('translates admin friend-request restrictions safely', async ({ assert }) => {
    const controller = createController({
      sendResult: {
        isFailure: true,
        error: 'Only admins can send friend requests',
      },
    })

    try {
      await controller.sendRequest({
        auth: {
          user: {
            userUuid: 'viewer-1',
          },
        },
        request: {
          validateUsing: async () => ({
            recipientUserUuid: 'friend-1',
          }),
        },
        response: {
          redirect() {
            return {
              toRoute() {},
            }
          },
        },
        i18n: createI18nHarness(),
      } as any)

      assert.fail('Expected sendRequest to throw a BusinessException')
    } catch (error) {
      assert.instanceOf(error, BusinessException)
      assert.equal((error as BusinessException).message, 'Only admins can send friend requests.')
    }
  })
})
