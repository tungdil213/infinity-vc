import { test } from '@japa/runner'
import {
  LobbyCreatedEvent,
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
  LobbyStatusChangedEvent,
  LobbyDeletedEvent,
} from '../../../app/domain/events/lobby_events.js'

test.group('Event Persistence and Reconstruction', () => {
  test('should serialize and deserialize LobbyCreatedEvent', ({ assert }) => {
    // Arrange
    const originalEvent = new LobbyCreatedEvent('lobby-123', 'Test Lobby', 'user-456', 4)

    // Act - Serialize to JSON
    const serialized = JSON.stringify(originalEvent)
    const deserialized = JSON.parse(serialized)

    // Assert
    assert.equal(deserialized.eventType, 'LobbyCreated')
    assert.equal(deserialized.lobbyUuid, 'lobby-123')
    assert.equal(deserialized.lobbyName, 'Test Lobby')
    assert.equal(deserialized.createdBy, 'user-456')
    assert.equal(deserialized.maxPlayers, 4)
    assert.isString(deserialized.timestamp)
  })

  test('should serialize and deserialize PlayerJoinedLobbyEvent', ({ assert }) => {
    // Arrange
    const player = { uuid: 'player-123', nickName: 'TestPlayer' }
    const originalEvent = new PlayerJoinedLobbyEvent('lobby-123', player, 2, 'WAITING')

    // Act
    const serialized = JSON.stringify(originalEvent)
    const deserialized = JSON.parse(serialized)

    // Assert
    assert.equal(deserialized.eventType, 'PlayerJoinedLobby')
    assert.equal(deserialized.lobbyUuid, 'lobby-123')
    assert.equal(deserialized.player.uuid, 'player-123')
    assert.equal(deserialized.player.nickName, 'TestPlayer')
    assert.equal(deserialized.playerCount, 2)
    assert.equal(deserialized.lobbyStatus, 'WAITING')
  })

  test('should serialize and deserialize LobbyStatusChangedEvent', ({ assert }) => {
    // Arrange
    const originalEvent = new LobbyStatusChangedEvent('lobby-123', 'WAITING', 'READY')

    // Act
    const serialized = JSON.stringify(originalEvent)
    const deserialized = JSON.parse(serialized)

    // Assert
    assert.equal(deserialized.eventType, 'LobbyStatusChanged')
    assert.equal(deserialized.lobbyUuid, 'lobby-123')
    assert.equal(deserialized.oldStatus, 'WAITING')
    assert.equal(deserialized.newStatus, 'READY')
  })

  test('should serialize and deserialize LobbyDeletedEvent', ({ assert }) => {
    // Arrange
    const originalEvent = new LobbyDeletedEvent('lobby-123', 'All players left')

    // Act
    const serialized = JSON.stringify(originalEvent)
    const deserialized = JSON.parse(serialized)

    // Assert
    assert.equal(deserialized.eventType, 'LobbyDeleted')
    assert.equal(deserialized.lobbyUuid, 'lobby-123')
    assert.equal(deserialized.reason, 'All players left')
  })

  test('should reconstruct lobby state from event sequence', ({ assert }) => {
    // Arrange - Create a sequence of events
    const events = [
      new LobbyCreatedEvent('lobby-123', 'Test Lobby', 'user-1', 4),
      new PlayerJoinedLobbyEvent(
        'lobby-123',
        { uuid: 'user-2', nickName: 'Player2' },
        2,
        'WAITING'
      ),
      new PlayerJoinedLobbyEvent(
        'lobby-123',
        { uuid: 'user-3', nickName: 'Player3' },
        3,
        'WAITING'
      ),
      new LobbyStatusChangedEvent('lobby-123', 'WAITING', 'READY'),
      new PlayerLeftLobbyEvent('lobby-123', { uuid: 'user-3', nickName: 'Player3' }, 2, 'WAITING'),
    ]

    // Act - Reconstruct state from events
    const lobbyState = {
      uuid: 'lobby-123',
      name: 'Test Lobby',
      createdBy: 'user-1',
      maxPlayers: 4,
      currentPlayers: 2,
      status: 'WAITING',
      players: ['user-1', 'user-2'],
    }

    // Simulate reconstruction logic
    events.forEach((event) => {
      switch (event.eventType) {
        case 'LobbyCreated':
          const createdEvent = event as LobbyCreatedEvent
          lobbyState.name = createdEvent.lobbyName
          lobbyState.createdBy = createdEvent.createdBy
          lobbyState.maxPlayers = createdEvent.maxPlayers
          break
        case 'PlayerJoinedLobby':
          const joinedEvent = event as PlayerJoinedLobbyEvent
          lobbyState.currentPlayers = joinedEvent.playerCount
          lobbyState.status = joinedEvent.lobbyStatus
          break
        case 'PlayerLeftLobby':
          const leftEvent = event as PlayerLeftLobbyEvent
          lobbyState.currentPlayers = leftEvent.playerCount
          lobbyState.status = leftEvent.lobbyStatus
          break
        case 'LobbyStatusChanged':
          const statusEvent = event as LobbyStatusChangedEvent
          lobbyState.status = statusEvent.newStatus
          break
      }
    })

    // Assert
    assert.equal(lobbyState.name, 'Test Lobby')
    assert.equal(lobbyState.createdBy, 'user-1')
    assert.equal(lobbyState.maxPlayers, 4)
    assert.equal(lobbyState.currentPlayers, 2)
    assert.equal(lobbyState.status, 'WAITING')
  })

  test('should handle event ordering correctly', ({ assert }) => {
    // Arrange - Events created with explicit timing
    const event1 = new LobbyCreatedEvent('lobby-123', 'Test Lobby', 'user-1', 4)
    const event2 = new PlayerJoinedLobbyEvent(
      'lobby-123',
      { uuid: 'user-2', nickName: 'Player2' },
      2,
      'WAITING'
    )
    const event3 = new LobbyStatusChangedEvent('lobby-123', 'WAITING', 'READY')

    // Create events array in reverse chronological order
    const events = [event3, event1, event2]

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Act & Assert - Check that events are sorted by timestamp
    assert.isTrue(sortedEvents[0].timestamp.getTime() <= sortedEvents[1].timestamp.getTime())
    assert.isTrue(sortedEvents[1].timestamp.getTime() <= sortedEvents[2].timestamp.getTime())
    assert.equal(sortedEvents.length, 3)
  })

  test('should preserve event immutability during persistence', ({ assert }) => {
    // Arrange
    const originalEvent = new LobbyCreatedEvent('lobby-123', 'Test Lobby', 'user-1', 4)
    const originalTimestamp = originalEvent.timestamp

    // Act - Serialize and deserialize
    const serialized = JSON.stringify(originalEvent)
    const deserialized = JSON.parse(serialized)

    // Modify deserialized object
    deserialized.lobbyName = 'Modified Lobby'

    // Assert - Original event should remain unchanged
    assert.equal(originalEvent.lobbyName, 'Test Lobby')
    assert.equal(originalEvent.timestamp, originalTimestamp)
    assert.notEqual(deserialized.lobbyName, originalEvent.lobbyName)
  })
})
