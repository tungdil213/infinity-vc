import { Response } from '@adonisjs/core/http'
import { SSEConnection, SSEConnectionManager, SSEEvent } from './types.js'
import crypto from 'node:crypto'

export class InMemorySSEConnectionManager implements SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000 // 60 seconds

  constructor() {
    this.startHeartbeat()
  }

  addConnection(userId: string, response: Response): string {
    const connectionId = crypto.randomUUID()
    
    const connection: SSEConnection = {
      id: connectionId,
      userId,
      response,
      channels: new Set(),
      lastPing: new Date(),
      isActive: true,
    }

    this.connections.set(connectionId, connection)

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)!.add(connectionId)

    // Setup SSE headers
    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    // Send initial connection event
    this.sendToConnection(connectionId, {
      id: crypto.randomUUID(),
      type: 'connection.established',
      data: { connectionId, userId },
      timestamp: new Date(),
    })

    // Handle connection close
    response.response.on('close', () => {
      this.removeConnection(connectionId)
    })

    return connectionId
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Mark as inactive
    connection.isActive = false

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId)
    if (userConnections) {
      userConnections.delete(connectionId)
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId)
      }
    }

    // Close response if still open
    try {
      if (!connection.response.response.destroyed) {
        connection.response.response.end()
      }
    } catch (error) {
      // Connection already closed
    }

    this.connections.delete(connectionId)
  }

  getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId)
  }

  getConnectionsByUser(userId: string): SSEConnection[] {
    const connectionIds = this.userConnections.get(userId)
    if (!connectionIds) return []

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is SSEConnection => conn !== undefined && conn.isActive)
  }

  async sendToConnection(connectionId: string, event: SSEEvent): Promise<boolean> {
    const connection = this.connections.get(connectionId)
    if (!connection || !connection.isActive) {
      return false
    }

    try {
      const sseData = this.formatSSEEvent(event)
      connection.response.response.write(sseData)
      connection.lastPing = new Date()
      return true
    } catch (error) {
      console.error(`Failed to send SSE event to connection ${connectionId}:`, error)
      this.removeConnection(connectionId)
      return false
    }
  }

  async sendToUser(userId: string, event: SSEEvent): Promise<number> {
    const connections = this.getConnectionsByUser(userId)
    let successCount = 0

    for (const connection of connections) {
      const success = await this.sendToConnection(connection.id, event)
      if (success) successCount++
    }

    return successCount
  }

  cleanup(): void {
    const now = new Date()
    const connectionsToRemove: string[] = []

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime()
      
      if (timeSinceLastPing > this.CONNECTION_TIMEOUT || !connection.isActive) {
        connectionsToRemove.push(connectionId)
      }
    }

    connectionsToRemove.forEach(id => this.removeConnection(id))
  }

  getActiveConnectionCount(): number {
    return Array.from(this.connections.values()).filter(conn => conn.isActive).length
  }

  private formatSSEEvent(event: SSEEvent): string {
    let sseData = ''
    
    if (event.id) {
      sseData += `id: ${event.id}\n`
    }
    
    if (event.type) {
      sseData += `event: ${event.type}\n`
    }
    
    if (event.retry) {
      sseData += `retry: ${event.retry}\n`
    }
    
    const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
    sseData += `data: ${data}\n\n`
    
    return sseData
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat()
      this.cleanup()
    }, this.HEARTBEAT_INTERVAL)
  }

  private async sendHeartbeat(): Promise<void> {
    const heartbeatEvent: SSEEvent = {
      id: crypto.randomUUID(),
      type: 'system.heartbeat',
      data: { timestamp: new Date() },
      timestamp: new Date(),
    }

    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        await this.sendToConnection(connection.id, heartbeatEvent)
      }
    }
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId)
    }
  }
}

// Singleton instance
export const sseConnectionManager = new InMemorySSEConnectionManager()
