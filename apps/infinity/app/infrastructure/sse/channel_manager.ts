import { SSEChannel, ChannelManager, SSEEvent } from './types.js'
import { sseConnectionManager } from './connection_manager.js'

export class SSEChannelImpl implements SSEChannel {
  public readonly name: string
  public readonly connections: Set<string> = new Set()

  constructor(name: string) {
    this.name = name
  }

  subscribe(connectionId: string): void {
    this.connections.add(connectionId)
  }

  unsubscribe(connectionId: string): void {
    this.connections.delete(connectionId)
  }

  async broadcast(event: SSEEvent): Promise<void> {
    const promises: Promise<boolean>[] = []

    for (const connectionId of this.connections) {
      promises.push(
        sseConnectionManager.sendToConnection(connectionId, {
          ...event,
          channel: this.name,
        })
      )
    }

    // Wait for all sends to complete and remove failed connections
    const results = await Promise.all(promises)
    const connectionIds = Array.from(this.connections)

    for (const [i, result] of results.entries()) {
      if (!result) {
        // Remove failed connection from channel
        this.connections.delete(connectionIds[i])
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size
  }
}

export class InMemoryChannelManager implements ChannelManager {
  private channels: Map<string, SSEChannel> = new Map()
  private connectionChannels: Map<string, Set<string>> = new Map()

  createChannel(name: string): SSEChannel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }

    const channel = new SSEChannelImpl(name)
    this.channels.set(name, channel)
    return channel
  }

  getChannel(name: string): SSEChannel | undefined {
    return this.channels.get(name)
  }

  deleteChannel(name: string): void {
    const channel = this.channels.get(name)
    if (!channel) return

    // Unsubscribe all connections from this channel
    for (const connectionId of channel.connections) {
      this.unsubscribeFromChannel(name, connectionId)
    }

    this.channels.delete(name)
  }

  subscribeToChannel(channelName: string, connectionId: string): boolean {
    // Verify connection exists
    const connection = sseConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isActive) {
      return false
    }

    // Create channel if it doesn't exist
    const channel = this.createChannel(channelName)

    // Subscribe connection to channel
    channel.subscribe(connectionId)

    // Track connection's channels
    if (!this.connectionChannels.has(connectionId)) {
      this.connectionChannels.set(connectionId, new Set())
    }
    this.connectionChannels.get(connectionId)!.add(channelName)

    // Update connection's channel list
    connection.channels.add(channelName)

    return true
  }

  unsubscribeFromChannel(channelName: string, connectionId: string): boolean {
    const channel = this.channels.get(channelName)
    if (!channel) return false

    // Unsubscribe from channel
    channel.unsubscribe(connectionId)

    // Update connection tracking
    const connectionChannels = this.connectionChannels.get(connectionId)
    if (connectionChannels) {
      connectionChannels.delete(channelName)
      if (connectionChannels.size === 0) {
        this.connectionChannels.delete(connectionId)
      }
    }

    // Update connection's channel list
    const connection = sseConnectionManager.getConnection(connectionId)
    if (connection) {
      connection.channels.delete(channelName)
    }

    // Clean up empty channels
    if (channel.getConnectionCount() === 0) {
      this.channels.delete(channelName)
    }

    return true
  }

  async broadcastToChannel(channelName: string, event: SSEEvent): Promise<void> {
    const channel = this.channels.get(channelName)
    if (!channel) {
      console.warn(`Attempted to broadcast to non-existent channel: ${channelName}`)
      return
    }

    await channel.broadcast(event)
  }

  getChannelNames(): string[] {
    return Array.from(this.channels.keys())
  }

  cleanup(): void {
    // Remove channels with no active connections
    const channelsToDelete: string[] = []

    for (const [channelName, channel] of this.channels) {
      // Check if all connections in this channel are still active
      const activeConnections = new Set<string>()

      for (const connectionId of channel.connections) {
        const connection = sseConnectionManager.getConnection(connectionId)
        if (connection && connection.isActive) {
          activeConnections.add(connectionId)
        }
      }

      // Update channel connections to only include active ones
      channel.connections.clear()
      for (const connectionId of activeConnections) {
        channel.connections.add(connectionId)
      }

      // Mark empty channels for deletion
      if (channel.getConnectionCount() === 0) {
        channelsToDelete.push(channelName)
      }
    }

    // Delete empty channels
    channelsToDelete.forEach((channelName) => this.deleteChannel(channelName))

    // Clean up connection channel tracking
    const connectionsToClean: string[] = []
    for (const [connectionId] of this.connectionChannels) {
      const connection = sseConnectionManager.getConnection(connectionId)
      if (!connection || !connection.isActive) {
        connectionsToClean.push(connectionId)
      }
    }

    connectionsToClean.forEach((connectionId) => {
      this.connectionChannels.delete(connectionId)
    })
  }

  // Utility methods
  getChannelConnectionCount(channelName: string): number {
    const channel = this.channels.get(channelName)
    return channel ? channel.getConnectionCount() : 0
  }

  getConnectionChannels(connectionId: string): string[] {
    const channels = this.connectionChannels.get(connectionId)
    return channels ? Array.from(channels) : []
  }

  getTotalChannelCount(): number {
    return this.channels.size
  }

  getChannelStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [channelName, channel] of this.channels) {
      stats[channelName] = channel.getConnectionCount()
    }
    return stats
  }
}

// Singleton instance
export const channelManager = new InMemoryChannelManager()
