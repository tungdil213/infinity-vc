import { test } from '@japa/runner'
import { TransmitLobbyService } from '#application/services/transmit_lobby_service'
import { eventBus } from '#infrastructure/events/event_bus'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test.group('TransmitLobbyService', (group) => {
  group.each.setup(() => {
    eventBus.clear()
  })

  group.each.teardown(() => {
    eventBus.clear()
  })

  test('publishes owner notification when lobby becomes full', async ({ assert }) => {
    const service = new TransmitLobbyService()
    const ownerFullEvents: any[] = []
    const playerJoinedEvents: any[] = []

    eventBus.subscribe('LobbyOwnerLobbyFull', (event) => {
      ownerFullEvents.push(event)
    })
    eventBus.subscribe('PlayerJoinedLobby', (event) => {
      playerJoinedEvents.push(event)
    })

    service.notifyPlayerJoined(
      'lobby-1',
      { uuid: 'user-2', nickName: 'Guest 2' },
      {
        uuid: 'lobby-1',
        name: 'Private Squad',
        createdBy: 'user-1',
        currentPlayers: 4,
        maxPlayers: 4,
      }
    )

    await wait(20)

    assert.lengthOf(playerJoinedEvents, 1)
    assert.lengthOf(ownerFullEvents, 1)
    assert.equal(ownerFullEvents[0].payload.ownerUuid, 'user-1')
    assert.equal(ownerFullEvents[0].payload.lobbyUuid, 'lobby-1')
    assert.equal(ownerFullEvents[0].payload.currentPlayers, 4)
    assert.equal(ownerFullEvents[0].payload.maxPlayers, 4)
    assert.equal(ownerFullEvents[0].payload.triggeredBy.uuid, 'user-2')
  })

  test('does not publish owner notification when lobby is not full', async ({ assert }) => {
    const service = new TransmitLobbyService()
    const ownerFullEvents: any[] = []

    eventBus.subscribe('LobbyOwnerLobbyFull', (event) => {
      ownerFullEvents.push(event)
    })

    service.notifyPlayerJoined(
      'lobby-2',
      { uuid: 'user-3', nickName: 'Guest 3' },
      {
        uuid: 'lobby-2',
        name: 'Open Squad',
        createdBy: 'user-1',
        currentPlayers: 2,
        maxPlayers: 4,
      }
    )

    await wait(20)

    assert.lengthOf(ownerFullEvents, 0)
  })
})
