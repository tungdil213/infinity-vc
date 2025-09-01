import { test } from '@japa/runner'
import { LobbyEventBroadcaster } from '../../../app/application/services/lobby_event_broadcaster.js'
import { LobbyNotificationService } from '../../../app/application/services/lobby_notification_service.js'
import { LobbyEventType } from '../../../app/domain/events/lobby_event_types.js'

// Mock WebSocket connection interface
interface MockConnection {
  id: string
  userId?: string
  lobbyId?: string
  send: (data: string) => void
  close: () => void
  isOpen: boolean
}

// Mock connections storage
const mockConnections: Map<string, MockConnection> = new Map()
const sentMessages: Array<{ connectionId: string; message: any }> = []

// Mock WebSocket server interface
const createMockWebSocketServer = () => ({
  addConnection: (connection: MockConnection) => {
    mockConnections.set(connection.id, connection)
  },
  removeConnection: (connectionId: string) => {
    mockConnections.delete(connectionId)
  },
  broadcast: (message: any, filter?: (conn: MockConnection) => boolean) => {
    for (const [id, conn] of mockConnections) {
      if (!filter || filter(conn)) {
        if (conn.isOpen) {
          conn.send(JSON.stringify(message))
        }
      }
    }
  },
  getConnections: () => Array.from(mockConnections.values())
})

// Helper to create mock connections
const createMockConnection = (id: string, userId?: string, lobbyId?: string): MockConnection => ({
  id,
  userId,
  lobbyId,
  isOpen: true,
  send: (data: string) => {
    sentMessages.push({ connectionId: id, message: JSON.parse(data) })
  },
  close: () => {
    const conn = mockConnections.get(id)
    if (conn) {
      conn.isOpen = false
    }
  }
})

test.group('LobbyEventBroadcaster', (group) => {
  let broadcaster: LobbyEventBroadcaster
  let notificationService: LobbyNotificationService

  group.setup(() => {
    // Reset state before each test group
    mockConnections.clear()
    sentMessages.length = 0
  })

  group.each.setup(() => {
    // Reset state before each test
    mockConnections.clear()
    sentMessages.length = 0
    
    // Clean up previous broadcaster if exists
    if (broadcaster) {
      broadcaster.destroy()
    }
    
    // Create fresh instances
    notificationService = new LobbyNotificationService()
    notificationService.removeAllListeners() // Ensure clean state
    
    const mockWebSocketServer = createMockWebSocketServer()
    broadcaster = new LobbyEventBroadcaster(mockWebSocketServer as any, notificationService)
  })

  group.each.teardown(() => {
    // Clean up after each test
    if (broadcaster) {
      broadcaster.destroy()
    }
    mockConnections.clear()
    sentMessages.length = 0
  })

  test('should add and manage client connections', ({ assert }) => {
    // Arrange
    const connection1 = createMockConnection('conn-1', 'user-1', 'lobby-1')
    const connection2 = createMockConnection('conn-2', 'user-2', 'lobby-1')

    // Act
    broadcaster.addConnection(connection1)
    broadcaster.addConnection(connection2)

    // Assert
    const connections = broadcaster.getConnections()
    assert.equal(connections.length, 2)
    assert.isTrue(connections.some(c => c.id === 'conn-1'))
    assert.isTrue(connections.some(c => c.id === 'conn-2'))
  })

  test('should remove client connections', ({ assert }) => {
    // Arrange
    const connection = createMockConnection('conn-1', 'user-1', 'lobby-1')
    broadcaster.addConnection(connection)

    // Act
    broadcaster.removeConnection('conn-1')

    // Assert
    const connections = broadcaster.getConnections()
    assert.equal(connections.length, 0)
  })

  test('should broadcast player joined event to all lobby members', ({ assert }) => {
    // Arrange
    const connection1 = createMockConnection('conn-1', 'user-1', 'lobby-1')
    const connection2 = createMockConnection('conn-2', 'user-2', 'lobby-1')
    const connection3 = createMockConnection('conn-3', 'user-3', 'lobby-2') // Different lobby
    
    broadcaster.addConnection(connection1)
    broadcaster.addConnection(connection2)
    broadcaster.addConnection(connection3)

    const playerData = { uuid: 'user-4', nickName: 'NewPlayer', email: 'new@example.com' }
    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'waiting',
      currentPlayers: 2,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act
    notificationService.notifyPlayerJoined('lobby-1', playerData, lobbyData)

    // Assert
    // Should send to connections in lobby-1 only
    const lobby1Messages = sentMessages.filter(m => 
      ['conn-1', 'conn-2'].includes(m.connectionId)
    )
    const lobby2Messages = sentMessages.filter(m => 
      m.connectionId === 'conn-3'
    )

    assert.equal(lobby1Messages.length, 2)
    assert.equal(lobby2Messages.length, 0)

    // Check message content
    const message = lobby1Messages[0].message
    assert.equal(message.type, LobbyEventType.PLAYER_JOINED)
    assert.equal(message.lobbyId, 'lobby-1')
    assert.equal(message.player.uuid, 'user-4')
  })

  test('should broadcast player left event to lobby members', ({ assert }) => {
    // Arrange
    const connection1 = createMockConnection('conn-1', 'user-1', 'lobby-1')
    const connection2 = createMockConnection('conn-2', 'user-2', 'lobby-1')
    
    broadcaster.addConnection(connection1)
    broadcaster.addConnection(connection2)

    const playerData = { uuid: 'user-2', nickName: 'LeavingPlayer', email: 'leaving@example.com' }
    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'waiting',
      currentPlayers: 1,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act
    notificationService.notifyPlayerLeft('lobby-1', playerData, lobbyData)

    // Assert
    assert.equal(sentMessages.length, 2)
    const message = sentMessages[0].message
    assert.equal(message.type, LobbyEventType.PLAYER_LEFT)
    assert.equal(message.lobbyId, 'lobby-1')
    assert.equal(message.player.uuid, 'user-2')
  })

  test('should broadcast lobby status change events', ({ assert }) => {
    // Arrange
    const connection = createMockConnection('conn-1', 'user-1', 'lobby-1')
    broadcaster.addConnection(connection)

    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'ready',
      currentPlayers: 2,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act
    notificationService.notifyStatusChanged('lobby-1', 'waiting', 'ready', lobbyData)

    // Assert
    assert.equal(sentMessages.length, 1)
    const message = sentMessages[0].message
    assert.equal(message.type, LobbyEventType.STATUS_CHANGED)
    assert.equal(message.lobbyId, 'lobby-1')
    assert.equal(message.oldStatus, 'waiting')
    assert.equal(message.newStatus, 'ready')
  })

  test('should broadcast game started events', ({ assert }) => {
    // Arrange
    const connection = createMockConnection('conn-1', 'user-1', 'lobby-1')
    broadcaster.addConnection(connection)

    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'starting',
      currentPlayers: 2,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act
    notificationService.notifyGameStarted('lobby-1', 'game-123', lobbyData)

    // Assert
    assert.equal(sentMessages.length, 1)
    const message = sentMessages[0].message
    assert.equal(message.type, LobbyEventType.GAME_STARTED)
    assert.equal(message.lobbyId, 'lobby-1')
    assert.equal(message.gameId, 'game-123')
  })

  test('should broadcast lobby deleted events', ({ assert }) => {
    // Arrange
    const connection = createMockConnection('conn-1', 'user-1', 'lobby-1')
    broadcaster.addConnection(connection)

    // Act
    notificationService.notifyLobbyDeleted('lobby-1', 'user-1')

    // Assert
    assert.equal(sentMessages.length, 1)
    const message = sentMessages[0].message
    assert.equal(message.type, LobbyEventType.LOBBY_DELETED)
    assert.equal(message.lobbyId, 'lobby-1')
    assert.equal(message.lobbyId, 'lobby-1')
  })

  test('should handle connection errors gracefully', ({ assert }) => {
    // Arrange
    const connection = createMockConnection('conn-1', 'user-1', 'lobby-1')
    connection.isOpen = false // Simulate closed connection
    broadcaster.addConnection(connection)

    const playerData = { uuid: 'user-2', nickName: 'NewPlayer', email: 'new@example.com' }
    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'waiting',
      currentPlayers: 2,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act & Assert - Should not throw error
    assert.doesNotThrow(() => {
      notificationService.notifyPlayerJoined('lobby-1', playerData, lobbyData)
    })

    // Should not send messages to closed connections
    assert.equal(sentMessages.length, 0)
  })

  test('should filter events by lobby membership', ({ assert }) => {
    // Arrange
    const connection1 = createMockConnection('conn-1', 'user-1', 'lobby-1')
    const connection2 = createMockConnection('conn-2', 'user-2', 'lobby-2')
    const connection3 = createMockConnection('conn-3', 'user-3') // No lobby
    
    broadcaster.addConnection(connection1)
    broadcaster.addConnection(connection2)
    broadcaster.addConnection(connection3)

    const playerData = { uuid: 'user-4', nickName: 'NewPlayer', email: 'new@example.com' }
    const lobbyData = {
      uuid: 'lobby-1',
      name: 'Test Lobby',
      status: 'waiting',
      currentPlayers: 2,
      maxPlayers: 4,
      players: [],
      creator: { uuid: 'creator-1', nickName: 'Creator' }
    }

    // Act
    notificationService.notifyPlayerJoined('lobby-1', playerData, lobbyData)

    // Assert
    // Only connection in lobby-1 should receive the message
    const receivedConnections = sentMessages.map(m => m.connectionId)
    assert.includeMembers(receivedConnections, ['conn-1'])
    assert.notIncludeMembers(receivedConnections, ['conn-2', 'conn-3'])
  })

  test('should cleanup closed connections automatically', ({ assert }) => {
    // Arrange
    const connection1 = createMockConnection('conn-1', 'user-1', 'lobby-1')
    const connection2 = createMockConnection('conn-2', 'user-2', 'lobby-1')
    
    broadcaster.addConnection(connection1)
    broadcaster.addConnection(connection2)

    // Simulate connection1 closing
    connection1.close()

    // Act
    broadcaster.cleanupClosedConnections()

    // Assert
    const connections = broadcaster.getConnections()
    assert.equal(connections.length, 1)
    assert.equal(connections[0].id, 'conn-2')
  })
})
