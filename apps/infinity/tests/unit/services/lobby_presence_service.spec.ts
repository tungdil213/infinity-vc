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
})
