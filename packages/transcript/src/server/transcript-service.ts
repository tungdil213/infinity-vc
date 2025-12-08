import type { IEvent } from '@tyfo.dev/events'
import type { ITranscriptMessage, IChannel, SubscriptionOptions } from '../core/types.js'

/**
 * Server-side transcript service interface
 */
export interface ITranscriptService {
  /**
   * Initialize the service
   */
  initialize(): Promise<void>

  /**
   * Register a channel
   */
  registerChannel(channel: IChannel): void

  /**
   * Broadcast a message to a channel
   */
  broadcast<TPayload>(channel: string, type: string, payload: TPayload): Promise<void>

  /**
   * Send a message to a specific connection
   */
  sendToConnection<TPayload>(connectionId: string, type: string, payload: TPayload): Promise<void>

  /**
   * Send a message to a specific user (all their connections)
   */
  sendToUser<TPayload>(userId: string, type: string, payload: TPayload): Promise<void>

  /**
   * Get channel subscriber count
   */
  getSubscriberCount(channel: string): number

  /**
   * Get all active channels
   */
  getActiveChannels(): string[]

  /**
   * Get service statistics
   */
  getStats(): TranscriptServiceStats

  /**
   * Cleanup and shutdown
   */
  destroy(): Promise<void>
}

/**
 * Service statistics
 */
export interface TranscriptServiceStats {
  activeConnections: number
  activeChannels: number
  totalMessagesSent: number
  connectionsByUser: Map<string, number>
}

/**
 * Connection interface for server-side
 */
export interface IServerConnection {
  /** Unique connection ID */
  readonly id: string
  /** User ID (if authenticated) */
  readonly userId?: string
  /** When connection was established */
  readonly connectedAt: Date
  /** Subscribed channels */
  readonly channels: Set<string>

  /**
   * Send a message to this connection
   */
  send<TPayload>(message: ITranscriptMessage<TPayload>): Promise<void>

  /**
   * Close the connection
   */
  close(): void

  /**
   * Check if connection is alive
   */
  isAlive(): boolean
}

/**
 * Connection manager interface
 */
export interface IConnectionManager {
  /**
   * Add a new connection
   */
  add(connection: IServerConnection): void

  /**
   * Remove a connection
   */
  remove(connectionId: string): void

  /**
   * Get a connection by ID
   */
  get(connectionId: string): IServerConnection | undefined

  /**
   * Get all connections for a user
   */
  getByUser(userId: string): IServerConnection[]

  /**
   * Get all connections subscribed to a channel
   */
  getByChannel(channel: string): IServerConnection[]

  /**
   * Subscribe a connection to a channel
   */
  subscribe(connectionId: string, channel: string): boolean

  /**
   * Unsubscribe a connection from a channel
   */
  unsubscribe(connectionId: string, channel: string): boolean

  /**
   * Get all active connections
   */
  getAll(): IServerConnection[]

  /**
   * Get connection count
   */
  getCount(): number

  /**
   * Cleanup dead connections
   */
  cleanup(): number
}

/**
 * In-memory connection manager implementation
 */
export class InMemoryConnectionManager implements IConnectionManager {
  private connections: Map<string, IServerConnection> = new Map()
  private userConnections: Map<string, Set<string>> = new Map()
  private channelConnections: Map<string, Set<string>> = new Map()

  add(connection: IServerConnection): void {
    this.connections.set(connection.id, connection)

    if (connection.userId) {
      if (!this.userConnections.has(connection.userId)) {
        this.userConnections.set(connection.userId, new Set())
      }
      this.userConnections.get(connection.userId)!.add(connection.id)
    }
  }

  remove(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Remove from user index
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId)
      if (userConns) {
        userConns.delete(connectionId)
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId)
        }
      }
    }

    // Remove from channel indices
    for (const channel of connection.channels) {
      const channelConns = this.channelConnections.get(channel)
      if (channelConns) {
        channelConns.delete(connectionId)
        if (channelConns.size === 0) {
          this.channelConnections.delete(channel)
        }
      }
    }

    this.connections.delete(connectionId)
  }

  get(connectionId: string): IServerConnection | undefined {
    return this.connections.get(connectionId)
  }

  getByUser(userId: string): IServerConnection[] {
    const connectionIds = this.userConnections.get(userId)
    if (!connectionIds) return []

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((c): c is IServerConnection => c !== undefined)
  }

  getByChannel(channel: string): IServerConnection[] {
    const connectionIds = this.channelConnections.get(channel)
    if (!connectionIds) return []

    return Array.from(connectionIds)
      .map((id) => this.connections.get(id))
      .filter((c): c is IServerConnection => c !== undefined)
  }

  subscribe(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) return false

    connection.channels.add(channel)

    if (!this.channelConnections.has(channel)) {
      this.channelConnections.set(channel, new Set())
    }
    this.channelConnections.get(channel)!.add(connectionId)

    return true
  }

  unsubscribe(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) return false

    connection.channels.delete(channel)

    const channelConns = this.channelConnections.get(channel)
    if (channelConns) {
      channelConns.delete(connectionId)
      if (channelConns.size === 0) {
        this.channelConnections.delete(channel)
      }
    }

    return true
  }

  getAll(): IServerConnection[] {
    return Array.from(this.connections.values())
  }

  getCount(): number {
    return this.connections.size
  }

  cleanup(): number {
    let removed = 0
    for (const [id, connection] of this.connections) {
      if (!connection.isAlive()) {
        this.remove(id)
        removed++
      }
    }
    return removed
  }
}

/**
 * Abstract transcript service with common functionality
 */
export abstract class BaseTranscriptService implements ITranscriptService {
  protected connectionManager: IConnectionManager
  protected channels: Map<string, IChannel> = new Map()
  protected stats: TranscriptServiceStats = {
    activeConnections: 0,
    activeChannels: 0,
    totalMessagesSent: 0,
    connectionsByUser: new Map(),
  }

  constructor(connectionManager?: IConnectionManager) {
    this.connectionManager = connectionManager ?? new InMemoryConnectionManager()
  }

  abstract initialize(): Promise<void>

  registerChannel(channel: IChannel): void {
    this.channels.set(channel.id, channel)
  }

  async broadcast<TPayload>(channel: string, type: string, payload: TPayload): Promise<void> {
    const message = this.createMessage(channel, type, payload)
    const connections = this.connectionManager.getByChannel(channel)

    await Promise.all(
      connections.map(async (connection) => {
        try {
          await connection.send(message)
          this.stats.totalMessagesSent++
        } catch (error) {
          console.error(`Failed to send to connection ${connection.id}:`, error)
        }
      })
    )
  }

  async sendToConnection<TPayload>(
    connectionId: string,
    type: string,
    payload: TPayload
  ): Promise<void> {
    const connection = this.connectionManager.get(connectionId)
    if (!connection) return

    const message = this.createMessage('direct', type, payload)
    await connection.send(message)
    this.stats.totalMessagesSent++
  }

  async sendToUser<TPayload>(userId: string, type: string, payload: TPayload): Promise<void> {
    const connections = this.connectionManager.getByUser(userId)
    const message = this.createMessage(`user:${userId}`, type, payload)

    await Promise.all(
      connections.map(async (connection) => {
        try {
          await connection.send(message)
          this.stats.totalMessagesSent++
        } catch (error) {
          console.error(`Failed to send to user connection ${connection.id}:`, error)
        }
      })
    )
  }

  getSubscriberCount(channel: string): number {
    return this.connectionManager.getByChannel(channel).length
  }

  getActiveChannels(): string[] {
    const channels = new Set<string>()
    for (const connection of this.connectionManager.getAll()) {
      for (const channel of connection.channels) {
        channels.add(channel)
      }
    }
    return Array.from(channels)
  }

  getStats(): TranscriptServiceStats {
    return {
      ...this.stats,
      activeConnections: this.connectionManager.getCount(),
      activeChannels: this.getActiveChannels().length,
    }
  }

  async destroy(): Promise<void> {
    for (const connection of this.connectionManager.getAll()) {
      connection.close()
    }
  }

  protected createMessage<TPayload>(
    channel: string,
    type: string,
    payload: TPayload
  ): ITranscriptMessage<TPayload> {
    return {
      id: crypto.randomUUID(),
      channel,
      type,
      payload,
      timestamp: new Date(),
    }
  }
}

/**
 * Create connection manager
 */
export function createConnectionManager(): IConnectionManager {
  return new InMemoryConnectionManager()
}
