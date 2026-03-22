import { test } from '@japa/runner'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test.group('LobbyPresenceService', (group) => {
  let service: LobbyPresenceService

  group.each.setup(() => {
    service = new LobbyPresenceService(30)
  })

  group.each.teardown(() => {
    service.clearAllPendingLeaves()
  })

  test('schedules delayed leave when disconnect is reported', async ({ assert }) => {
    const executed: Array<{ lobbyUuid: string; userUuid: string }> = []

    service.scheduleLeaveOnDisconnect(
      {
        lobbyUuid: 'lobby-1',
        userUuid: 'user-1',
      },
      async (payload) => {
        executed.push(payload)
      }
    )

    await wait(50)

    assert.lengthOf(executed, 1)
    assert.equal(executed[0].lobbyUuid, 'lobby-1')
    assert.equal(executed[0].userUuid, 'user-1')
    assert.equal(service.getPendingCount(), 0)
  })

  test('cancels pending leave when connection heartbeat is received', async ({ assert }) => {
    const executed: Array<{ lobbyUuid: string; userUuid: string }> = []

    service.scheduleLeaveOnDisconnect(
      {
        lobbyUuid: 'lobby-2',
        userUuid: 'user-2',
      },
      async (payload) => {
        executed.push(payload)
      }
    )

    service.markConnected({
      lobbyUuid: 'lobby-2',
      userUuid: 'user-2',
    })

    await wait(50)

    assert.lengthOf(executed, 0)
    assert.equal(service.getPendingCount(), 0)
  })

  test('re-scheduling disconnect keeps only the latest timer', async ({ assert }) => {
    const executed: Array<{ lobbyUuid: string; userUuid: string }> = []

    const payload = {
      lobbyUuid: 'lobby-3',
      userUuid: 'user-3',
    }

    service.scheduleLeaveOnDisconnect(payload, async (leavePayload) => {
      executed.push(leavePayload)
    })

    await wait(10)

    service.scheduleLeaveOnDisconnect(payload, async (leavePayload) => {
      executed.push(leavePayload)
    })

    await wait(50)

    assert.lengthOf(executed, 1)
    assert.equal(executed[0].lobbyUuid, payload.lobbyUuid)
    assert.equal(executed[0].userUuid, payload.userUuid)
  })

  test('cancels delayed leave when reconnect heartbeat uses a new client session id', async ({
    assert,
  }) => {
    const scheduler = new LobbyPresenceService(30)
    const heartbeatService = new LobbyPresenceService(30)
    const executed: Array<{ lobbyUuid: string; userUuid: string }> = []

    scheduler.markConnected({
      lobbyUuid: 'lobby-4',
      userUuid: 'user-4',
      clientSessionId: 'session-a',
    })

    scheduler.scheduleLeaveOnDisconnect(
      {
        lobbyUuid: 'lobby-4',
        userUuid: 'user-4',
        clientSessionId: 'session-a',
      },
      async (payload) => {
        executed.push(payload)
      }
    )

    heartbeatService.markConnected({
      lobbyUuid: 'lobby-4',
      userUuid: 'user-4',
      clientSessionId: 'session-b',
    })

    await wait(50)

    assert.lengthOf(executed, 0)
    assert.equal(service.getPendingCount(), 0)
  })

  test('auto-leaves when heartbeat expires without disconnect beacon', async ({ assert }) => {
    const staleExecuted: Array<{ lobbyUuid: string; userUuid: string }> = []

    service.markConnected(
      {
        lobbyUuid: 'lobby-5',
        userUuid: 'user-5',
      },
      async (payload) => {
        staleExecuted.push(payload)
      }
    )

    await wait(50)

    assert.lengthOf(staleExecuted, 1)
    assert.equal(staleExecuted[0].lobbyUuid, 'lobby-5')
    assert.equal(staleExecuted[0].userUuid, 'user-5')
  })

  test('refreshes stale heartbeat timeout when a new heartbeat arrives', async ({ assert }) => {
    const staleExecuted: Array<{ lobbyUuid: string; userUuid: string }> = []
    const payload = {
      lobbyUuid: 'lobby-6',
      userUuid: 'user-6',
    }

    service.markConnected(payload, async (leavePayload) => {
      staleExecuted.push(leavePayload)
    })

    await wait(15)
    service.markConnected(payload)

    await wait(20)
    assert.lengthOf(staleExecuted, 0)

    await wait(25)
    assert.lengthOf(staleExecuted, 1)
  })

  test('prefers disconnect timer over stale timeout when beacon is received', async ({
    assert,
  }) => {
    const staleExecuted: Array<{ lobbyUuid: string; userUuid: string }> = []
    const disconnectExecuted: Array<{ lobbyUuid: string; userUuid: string }> = []
    const payload = {
      lobbyUuid: 'lobby-7',
      userUuid: 'user-7',
    }

    service.markConnected(payload, async (leavePayload) => {
      staleExecuted.push(leavePayload)
    })

    service.scheduleLeaveOnDisconnect(payload, async (leavePayload) => {
      disconnectExecuted.push(leavePayload)
    })

    await wait(50)

    assert.lengthOf(disconnectExecuted, 1)
    assert.lengthOf(staleExecuted, 0)
  })

  test('clearConnection cancels stale heartbeat timeout', async ({ assert }) => {
    const staleExecuted: Array<{ lobbyUuid: string; userUuid: string }> = []
    const payload = {
      lobbyUuid: 'lobby-8',
      userUuid: 'user-8',
    }

    service.markConnected(payload, async (leavePayload) => {
      staleExecuted.push(leavePayload)
    })

    const wasCleared = service.clearConnection(payload)
    await wait(50)

    assert.isTrue(wasCleared)
    assert.lengthOf(staleExecuted, 0)
  })
})
