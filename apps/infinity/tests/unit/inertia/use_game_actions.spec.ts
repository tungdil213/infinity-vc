import { test } from '@japa/runner'
import {
  buildGameActionJsonHeaders,
  executeGameActionSubmission,
  postGameActionRequest,
  syncSubmittedMoveStateFromAvailableActions,
} from '../../../inertia/hooks/use_game_actions.js'

test.group('use_game_actions', () => {
  test('buildGameActionJsonHeaders includes content type and csrf token when present', ({
    assert,
  }) => {
    const headers = buildGameActionJsonHeaders({
      documentAdapter: {
        querySelector: (selector) =>
          selector === 'meta[name="csrf-token"]'
            ? {
                getAttribute: (attribute) => (attribute === 'content' ? 'csrf-token-value' : null),
              }
            : null,
      },
    })

    assert.deepEqual(headers, {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': 'csrf-token-value',
    })
  })

  test('postGameActionRequest keeps the existing network contract', async ({ assert }) => {
    let receivedUrl: string | null = null
    let receivedOptions: RequestInit | null = null

    const result = await postGameActionRequest({
      gameId: 'game-42',
      body: { action: 'draw' },
      documentAdapter: {
        querySelector: () => null,
      },
      fetchImpl: (async (input, init) => {
        receivedUrl = String(input)
        receivedOptions = init ?? null

        return {
          json: async () => ({ success: true }),
        } as Response
      }) as typeof fetch,
    })

    assert.equal(receivedUrl, '/api/v1/games/game-42/action')
    assert.deepEqual(receivedOptions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'draw' }),
    })
    assert.deepEqual(result, { success: true })
  })

  test('executeGameActionSubmission preserves guard, success, business error and failure flows', async ({
    assert,
  }) => {
    const loadingTransitions: boolean[] = []
    const notifications: string[] = []
    let successCount = 0

    await executeGameActionSubmission({
      isLoading: true,
      setIsLoading: (isLoading) => {
        loadingTransitions.push(isLoading)
      },
      submit: async () => ({ success: true }),
      addNotification: (message) => {
        notifications.push(message)
      },
      failureMessage: 'Failed to draw',
      onSuccess: async () => {
        successCount += 1
      },
    })

    assert.deepEqual(loadingTransitions, [])
    assert.equal(successCount, 0)

    await executeGameActionSubmission({
      isLoading: false,
      setIsLoading: (isLoading) => {
        loadingTransitions.push(isLoading)
      },
      submit: async () => ({ success: true }),
      addNotification: (message) => {
        notifications.push(message)
      },
      failureMessage: 'Failed to draw',
      onSuccess: async () => {
        successCount += 1
      },
    })

    await executeGameActionSubmission({
      isLoading: false,
      setIsLoading: (isLoading) => {
        loadingTransitions.push(isLoading)
      },
      submit: async () => ({ success: false, error: 'Nope' }),
      addNotification: (message) => {
        notifications.push(message)
      },
      failureMessage: 'Failed to draw',
      onSuccess: async () => {
        successCount += 1
      },
    })

    await executeGameActionSubmission({
      isLoading: false,
      setIsLoading: (isLoading) => {
        loadingTransitions.push(isLoading)
      },
      submit: async () => {
        throw new Error('network failure')
      },
      addNotification: (message) => {
        notifications.push(message)
      },
      failureMessage: 'Failed to draw',
      onSuccess: async () => {
        successCount += 1
      },
    })

    assert.deepEqual(loadingTransitions, [true, false, true, false, true, false])
    assert.equal(successCount, 1)
    assert.deepEqual(notifications, ['Error: Nope', 'Failed to draw'])
  })

  test('syncSubmittedMoveStateFromAvailableActions resets the last submitted move only when needed', ({
    assert,
  }) => {
    let currentMove: 'rock' | 'paper' | 'scissors' | null = 'rock'

    syncSubmittedMoveStateFromAvailableActions({
      nextAvailableActions: ['draw_card'],
      setLastSubmittedMove: (move) => {
        currentMove = move
      },
    })
    assert.equal(currentMove, 'rock')

    syncSubmittedMoveStateFromAvailableActions({
      nextAvailableActions: ['submit_move'],
      setLastSubmittedMove: (move) => {
        currentMove = move
      },
    })
    assert.isNull(currentMove)
  })
})
