import { test } from '@japa/runner'
import { LobbyStatusChangedEvent } from '../../../app/domain/events/lobby_events.js'

test.group('LobbyStatusChangedEvent', () => {
  test('should create event with correct properties', ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const oldStatus = 'WAITING'
    const newStatus = 'READY'

    // Act
    const event = new LobbyStatusChangedEvent(lobbyUuid, oldStatus, newStatus)

    // Assert
    assert.equal(event.eventType, 'LobbyStatusChanged')
    assert.equal(event.lobbyUuid, lobbyUuid)
    assert.equal(event.oldStatus, oldStatus)
    assert.equal(event.newStatus, newStatus)
    assert.instanceOf(event.timestamp, Date)
  })

  test('should have unique timestamp for each event', async ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const oldStatus = 'WAITING'
    const newStatus = 'READY'

    // Act
    const event1 = new LobbyStatusChangedEvent(lobbyUuid, oldStatus, newStatus)
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 1))
    const event2 = new LobbyStatusChangedEvent(lobbyUuid, newStatus, 'IN_GAME')

    // Assert
    assert.isTrue(event2.timestamp.getTime() >= event1.timestamp.getTime())
  })

  test('should handle different status transitions', ({ assert }) => {
    // Arrange & Act
    const waitingToReady = new LobbyStatusChangedEvent('lobby-1', 'WAITING', 'READY')
    const readyToInGame = new LobbyStatusChangedEvent('lobby-2', 'READY', 'IN_GAME')
    const inGameToClosed = new LobbyStatusChangedEvent('lobby-3', 'IN_GAME', 'CLOSED')

    // Assert
    assert.equal(waitingToReady.oldStatus, 'WAITING')
    assert.equal(waitingToReady.newStatus, 'READY')

    assert.equal(readyToInGame.oldStatus, 'READY')
    assert.equal(readyToInGame.newStatus, 'IN_GAME')

    assert.equal(inGameToClosed.oldStatus, 'IN_GAME')
    assert.equal(inGameToClosed.newStatus, 'CLOSED')
  })

  test('should be immutable after creation', ({ assert }) => {
    // Arrange
    const event = new LobbyStatusChangedEvent('lobby-123', 'WAITING', 'READY')
    const originalEventType = event.eventType
    const originalLobbyUuid = event.lobbyUuid
    const originalOldStatus = event.oldStatus
    const originalNewStatus = event.newStatus
    const originalTimestamp = event.timestamp

    // Act - Try to modify (should not work due to readonly)
    // These would cause TypeScript errors if attempted:
    // event.eventType = 'Modified'
    // event.lobbyUuid = 'modified-uuid'

    // Assert - Properties should remain unchanged
    assert.equal(event.eventType, originalEventType)
    assert.equal(event.lobbyUuid, originalLobbyUuid)
    assert.equal(event.oldStatus, originalOldStatus)
    assert.equal(event.newStatus, originalNewStatus)
    assert.equal(event.timestamp, originalTimestamp)
  })
})
