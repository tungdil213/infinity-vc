import { test } from '@japa/runner'
import { LobbyNotificationService } from '../../../app/application/services/lobby_notification_service.js'
import { LobbyEventType } from '../../../app/domain/events/lobby_event_types.js'

// Mock pour les listeners d'événements
class MockEventListener {
  public receivedEvents: any[] = []

  onLobbyEvent(event: any) {
    this.receivedEvents.push(event)
  }

  reset() {
    this.receivedEvents = []
  }
}

// Helper pour créer un joueur
function createPlayer() {
  return {
    uuid: crypto.randomUUID(),
    nickName: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
}

// Helper pour créer un lobby
function createLobby() {
  return {
    uuid: crypto.randomUUID(),
    name: `Lobby ${Date.now()}`,
    status: 'WAITING',
    currentPlayers: 1,
    maxPlayers: 4,
    players: [createPlayer()],
    creator: createPlayer(),
  }
}

test.group('LobbyNotificationService', (group) => {
  let notificationService: LobbyNotificationService
  let mockListener: MockEventListener

  group.setup(() => {
    notificationService = new LobbyNotificationService()
    mockListener = new MockEventListener()
  })

  group.each.setup(() => {
    // Reset pour chaque test
    notificationService.removeAllListeners()
    mockListener.reset()
  })

  group.teardown(() => {
    notificationService.removeAllListeners()
  })

  test('should register and notify listeners when player joins lobby', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const newPlayer = createPlayer()
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act
    notificationService.notifyPlayerJoined(lobby.uuid, newPlayer, lobby)

    // Assert
    assert.lengthOf(mockListener.receivedEvents, 1)
    const event = mockListener.receivedEvents[0]
    assert.equal(event.type, LobbyEventType.PLAYER_JOINED)
    assert.equal(event.lobbyUuid, lobby.uuid)
    assert.deepEqual(event.player, newPlayer)
    assert.deepEqual(event.lobby, lobby)
    assert.exists(event.timestamp)
  })

  test('should notify listeners when player leaves lobby', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const leavingPlayer = lobby.players[0]
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act
    notificationService.notifyPlayerLeft(lobby.uuid, leavingPlayer, lobby)

    // Assert
    assert.lengthOf(mockListener.receivedEvents, 1)
    const event = mockListener.receivedEvents[0]
    assert.equal(event.type, LobbyEventType.PLAYER_LEFT)
    assert.equal(event.lobbyUuid, lobby.uuid)
    assert.deepEqual(event.player, leavingPlayer)
    assert.deepEqual(event.lobby, lobby)
  })

  test('should notify listeners when lobby status changes', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const oldStatus = 'WAITING'
    const newStatus = 'READY'
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act
    notificationService.notifyStatusChanged(lobby.uuid, oldStatus, newStatus, lobby)

    // Assert
    assert.lengthOf(mockListener.receivedEvents, 1)
    const event = mockListener.receivedEvents[0]
    assert.equal(event.type, LobbyEventType.STATUS_CHANGED)
    assert.equal(event.lobbyUuid, lobby.uuid)
    assert.equal(event.oldStatus, oldStatus)
    assert.equal(event.newStatus, newStatus)
    assert.deepEqual(event.lobby, lobby)
  })

  test('should notify listeners when game starts', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const gameUuid = crypto.randomUUID()
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act
    notificationService.notifyGameStarted(lobby.uuid, gameUuid, lobby)

    // Assert
    assert.lengthOf(mockListener.receivedEvents, 1)
    const event = mockListener.receivedEvents[0]
    assert.equal(event.type, LobbyEventType.GAME_STARTED)
    assert.equal(event.lobbyUuid, lobby.uuid)
    assert.equal(event.gameUuid, gameUuid)
    assert.deepEqual(event.lobby, lobby)
  })

  test('should notify listeners when lobby is deleted', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act
    notificationService.notifyLobbyDeleted(lobby.uuid, lobby)

    // Assert
    assert.lengthOf(mockListener.receivedEvents, 1)
    const event = mockListener.receivedEvents[0]
    assert.equal(event.type, LobbyEventType.LOBBY_DELETED)
    assert.equal(event.lobbyUuid, lobby.uuid)
    assert.deepEqual(event.lobby, lobby)
  })

  test('should support multiple listeners', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const newPlayer = createPlayer()
    const listener1 = new MockEventListener()
    const listener2 = new MockEventListener()

    notificationService.addListener(listener1.onLobbyEvent.bind(listener1))
    notificationService.addListener(listener2.onLobbyEvent.bind(listener2))

    // Act
    notificationService.notifyPlayerJoined(lobby.uuid, newPlayer, lobby)

    // Assert
    assert.lengthOf(listener1.receivedEvents, 1)
    assert.lengthOf(listener2.receivedEvents, 1)
    assert.equal(listener1.receivedEvents[0].type, LobbyEventType.PLAYER_JOINED)
    assert.equal(listener2.receivedEvents[0].type, LobbyEventType.PLAYER_JOINED)
  })

  test('should remove specific listener', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const newPlayer = createPlayer()
    const listener1 = new MockEventListener()
    const listener2 = new MockEventListener()

    const unsubscribe1 = notificationService.addListener(listener1.onLobbyEvent.bind(listener1))
    notificationService.addListener(listener2.onLobbyEvent.bind(listener2))

    // Act
    unsubscribe1() // Remove first listener
    notificationService.notifyPlayerJoined(lobby.uuid, newPlayer, lobby)

    // Assert
    assert.lengthOf(listener1.receivedEvents, 0) // Should not receive event
    assert.lengthOf(listener2.receivedEvents, 1) // Should receive event
  })

  test('should handle errors in listeners gracefully', ({ assert }) => {
    // Arrange
    const lobby = createLobby()
    const newPlayer = createPlayer()
    const faultyListener = () => {
      throw new Error('Listener error')
    }

    notificationService.addListener(faultyListener)
    notificationService.addListener(mockListener.onLobbyEvent.bind(mockListener))

    // Act & Assert - Should not throw
    assert.doesNotThrow(() => {
      notificationService.notifyPlayerJoined(lobby.uuid, newPlayer, lobby)
    })

    // Good listener should still receive event
    assert.lengthOf(mockListener.receivedEvents, 1)
  })

  test('should filter events by lobby UUID', ({ assert }) => {
    // Arrange
    const lobby1 = createLobby()
    const lobby2 = createLobby()
    const newPlayer = createPlayer()

    const filteredListener = new MockEventListener()
    notificationService.addLobbyListener(
      lobby1.uuid,
      filteredListener.onLobbyEvent.bind(filteredListener)
    )

    // Act
    notificationService.notifyPlayerJoined(lobby1.uuid, newPlayer, lobby1)
    notificationService.notifyPlayerJoined(lobby2.uuid, newPlayer, lobby2)

    // Assert
    assert.lengthOf(filteredListener.receivedEvents, 1) // Only lobby1 event
    assert.equal(filteredListener.receivedEvents[0].lobbyUuid, lobby1.uuid)
  })
})
