import { test } from '@japa/runner'
import {
  attachGamePollingBrowserLifecycle,
  refreshGamePollingSafely,
  subscribeToGamePolling,
} from '../../../inertia/hooks/use_game_polling.js'

class WindowAdapterDouble {
  intervalId = 1
  intervalDelay: number | null = null
  intervalHandler: (() => void) | null = null
  focusHandler: (() => void) | null = null
  clearedIntervalId: number | null = null
  removedFocusHandler: (() => void) | null = null

  setInterval(handler: () => void, timeout: number): number {
    this.intervalHandler = handler
    this.intervalDelay = timeout
    return this.intervalId
  }

  clearInterval(intervalId: number): void {
    this.clearedIntervalId = intervalId
  }

  addEventListener(event: 'focus', handler: () => void): void {
    if (event === 'focus') {
      this.focusHandler = handler
    }
  }

  removeEventListener(event: 'focus', handler: () => void): void {
    if (event === 'focus') {
      this.removedFocusHandler = handler
    }
  }
}

class DocumentAdapterDouble {
  visibilityState: DocumentVisibilityState = 'hidden'
  visibilityHandler: (() => void) | null = null
  removedVisibilityHandler: (() => void) | null = null

  addEventListener(event: 'visibilitychange', handler: () => void): void {
    if (event === 'visibilitychange') {
      this.visibilityHandler = handler
    }
  }

  removeEventListener(event: 'visibilitychange', handler: () => void): void {
    if (event === 'visibilitychange') {
      this.removedVisibilityHandler = handler
    }
  }
}

test.group('use_game_polling', () => {
  test('refreshGamePollingSafely executes refresh and swallows failures', async ({ assert }) => {
    let successCount = 0
    let failureCount = 0

    refreshGamePollingSafely(async () => {
      successCount += 1
    })
    refreshGamePollingSafely(async () => {
      failureCount += 1
      throw new Error('network failure')
    })

    await Promise.resolve()

    assert.equal(successCount, 1)
    assert.equal(failureCount, 1)
  })

  test('subscribeToGamePolling wires realtime callbacks to safe refreshes', async ({ assert }) => {
    let refreshCount = 0
    let unsubscribeCalled = false
    let receivedGameId: string | null = null
    let realtimeCallback: ((event: unknown) => void) | null = null

    const unsubscribe = await subscribeToGamePolling({
      gameId: 'game-1',
      subscribeToGame: async (gameId, callback) => {
        receivedGameId = gameId
        realtimeCallback = callback
        return () => {
          unsubscribeCalled = true
        }
      },
      refreshGameState: async () => {
        refreshCount += 1
      },
    })

    assert.equal(receivedGameId, 'game-1')
    assert.isFunction(realtimeCallback)

    realtimeCallback?.({ type: 'game.updated' })
    await Promise.resolve()

    assert.equal(refreshCount, 1)

    unsubscribe()
    assert.isTrue(unsubscribeCalled)
  })

  test('attachGamePollingBrowserLifecycle registers cadence, triggers refreshes and cleans up', async ({
    assert,
  }) => {
    const windowAdapter = new WindowAdapterDouble()
    const documentAdapter = new DocumentAdapterDouble()
    let refreshCount = 0

    const cleanup = attachGamePollingBrowserLifecycle({
      refreshGameState: async () => {
        refreshCount += 1
      },
      pollingIntervalMs: 4200,
      windowAdapter,
      documentAdapter,
    })

    assert.equal(windowAdapter.intervalDelay, 4200)
    assert.isFunction(windowAdapter.focusHandler)
    assert.isFunction(documentAdapter.visibilityHandler)

    windowAdapter.focusHandler?.()
    windowAdapter.intervalHandler?.()
    documentAdapter.visibilityState = 'hidden'
    documentAdapter.visibilityHandler?.()
    documentAdapter.visibilityState = 'visible'
    documentAdapter.visibilityHandler?.()

    await Promise.resolve()

    assert.equal(refreshCount, 3)

    cleanup()

    assert.equal(windowAdapter.clearedIntervalId, 1)
    assert.equal(windowAdapter.removedFocusHandler, windowAdapter.focusHandler)
    assert.equal(documentAdapter.removedVisibilityHandler, documentAdapter.visibilityHandler)
  })
})
