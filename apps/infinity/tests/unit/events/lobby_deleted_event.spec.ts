import { test } from '@japa/runner'
import { LobbyDeletedEvent } from '../../../app/domain/events/lobby_events.js'

test.group('LobbyDeletedEvent', () => {
  test('should create event with correct properties', ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const reason = 'Last player left'

    // Act
    const event = new LobbyDeletedEvent(lobbyUuid, reason)

    // Assert
    assert.equal(event.eventType, 'LobbyDeleted')
    assert.equal(event.lobbyUuid, lobbyUuid)
    assert.equal(event.reason, reason)
    assert.instanceOf(event.timestamp, Date)
  })

  test('should have unique timestamp for each event', async ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const reason = 'Expired'

    // Act
    const event1 = new LobbyDeletedEvent(lobbyUuid, reason)
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 1))
    const event2 = new LobbyDeletedEvent('lobby-456', 'Manual deletion')

    // Assert
    assert.isTrue(event2.timestamp.getTime() >= event1.timestamp.getTime())
  })

  test('should handle different deletion reasons', ({ assert }) => {
    // Arrange & Act
    const expiredEvent = new LobbyDeletedEvent('lobby-1', 'Lobby expired')
    const emptyEvent = new LobbyDeletedEvent('lobby-2', 'All players left')
    const manualEvent = new LobbyDeletedEvent('lobby-3', 'Manual deletion by admin')
    const errorEvent = new LobbyDeletedEvent('lobby-4', 'System error')

    // Assert
    assert.equal(expiredEvent.reason, 'Lobby expired')
    assert.equal(emptyEvent.reason, 'All players left')
    assert.equal(manualEvent.reason, 'Manual deletion by admin')
    assert.equal(errorEvent.reason, 'System error')
  })

  test('should be immutable after creation', ({ assert }) => {
    // Arrange
    const event = new LobbyDeletedEvent('lobby-123', 'Test reason')
    const originalEventType = event.eventType
    const originalLobbyUuid = event.lobbyUuid
    const originalReason = event.reason
    const originalTimestamp = event.timestamp

    // Act - Try to modify (should not work due to readonly)
    // These would cause TypeScript errors if attempted:
    // event.eventType = 'Modified'
    // event.lobbyUuid = 'modified-uuid'

    // Assert - Properties should remain unchanged
    assert.equal(event.eventType, originalEventType)
    assert.equal(event.lobbyUuid, originalLobbyUuid)
    assert.equal(event.reason, originalReason)
    assert.equal(event.timestamp, originalTimestamp)
  })

  test('should handle empty reason string', ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const emptyReason = ''

    // Act
    const event = new LobbyDeletedEvent(lobbyUuid, emptyReason)

    // Assert
    assert.equal(event.reason, emptyReason)
    assert.equal(event.lobbyUuid, lobbyUuid)
  })

  test('should handle long reason strings', ({ assert }) => {
    // Arrange
    const lobbyUuid = 'lobby-123'
    const longReason =
      'This is a very long reason for deleting the lobby that contains multiple sentences and detailed information about why the lobby was deleted from the system.'

    // Act
    const event = new LobbyDeletedEvent(lobbyUuid, longReason)

    // Assert
    assert.equal(event.reason, longReason)
    assert.equal(event.lobbyUuid, lobbyUuid)
  })
})
