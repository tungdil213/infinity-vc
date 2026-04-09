import { test } from '@japa/runner'
import type { LobbyTransmitEvent } from '../../../../inertia/services/transmit_client.js'
import { LobbyRealtimeSync } from '../../../../inertia/services/lobby_realtime_sync.js'

interface TestTransmitContext {
  isConnected: boolean
  subscribeToLobbies: (callback: (event: LobbyTransmitEvent) => void) => Promise<() => void>
  subscribeToLobby: (
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ) => Promise<() => void>
  unsubscribeFrom: (channelName: string) => Promise<void>
}

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

function createTransmitContext(overrides: Partial<TestTransmitContext> = {}): TestTransmitContext {
  return {
    isConnected: true,
    subscribeToLobbies: async () => () => {},
    subscribeToLobby: async () => () => {},
    unsubscribeFrom: async () => {},
    ...overrides,
  }
}

test.group('LobbyRealtimeSync', () => {
  test('should retry global subscription after a transient failure', async ({ assert }) => {
    let subscribeCalls = 0

    const context = createTransmitContext({
      subscribeToLobbies: async () => {
        subscribeCalls += 1

        if (subscribeCalls === 1) {
          throw new Error('temporary failure')
        }

        return () => {}
      },
    })

    const sync = new LobbyRealtimeSync(
      context,
      {
        onGlobalLobbyEvent: () => {},
        onLobbyDetailEvent: () => {},
      },
      { retryDelayMs: 10 }
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(subscribeCalls, 1)

    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.equal(subscribeCalls, 2)

    sync.destroy()
  })

  test('should not create duplicate lobby subscriptions while one is pending', ({ assert }) => {
    const deferred = createDeferred<() => void>()
    let subscribeCalls = 0

    const context = createTransmitContext({
      subscribeToLobby: async () => {
        subscribeCalls += 1
        return deferred.promise
      },
    })

    const sync = new LobbyRealtimeSync(context, {
      onGlobalLobbyEvent: () => {},
      onLobbyDetailEvent: () => {},
    })

    sync.subscribeLobbyDetail('lobby-1')
    sync.subscribeLobbyDetail('lobby-1')

    assert.equal(subscribeCalls, 1)

    deferred.resolve(() => {})
    sync.destroy()
  })

  test('should retry lobby detail subscription after a transient failure', async ({ assert }) => {
    let subscribeCalls = 0

    const context = createTransmitContext({
      subscribeToLobby: async () => {
        subscribeCalls += 1

        if (subscribeCalls === 1) {
          throw new Error('temporary failure')
        }

        return () => {}
      },
    })

    const sync = new LobbyRealtimeSync(
      context,
      {
        onGlobalLobbyEvent: () => {},
        onLobbyDetailEvent: () => {},
      },
      { retryDelayMs: 10 }
    )

    sync.subscribeLobbyDetail('lobby-retry-1')

    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(subscribeCalls, 1)

    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.equal(subscribeCalls, 2)

    sync.destroy()
  })

  test('should cleanup late subscription resolve after unsubscribe request', async ({ assert }) => {
    const deferred = createDeferred<() => void>()
    let unsubscribeCalls = 0

    const context = createTransmitContext({
      subscribeToLobby: async () => deferred.promise,
    })

    const sync = new LobbyRealtimeSync(context, {
      onGlobalLobbyEvent: () => {},
      onLobbyDetailEvent: () => {},
    })

    sync.subscribeLobbyDetail('lobby-2')
    sync.unsubscribeLobbyDetail('lobby-2')

    deferred.resolve(() => {
      unsubscribeCalls += 1
    })

    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(unsubscribeCalls, 1)

    sync.destroy()
  })
})
