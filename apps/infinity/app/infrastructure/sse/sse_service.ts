import { eventBus, type IEvent } from '../events/event_bus.js'
import { sseConnectionManager } from './connection_manager.js'
import { channelManager } from './channel_manager.js'
import { eventTransformer } from './event_transformer.js'
import { SSEEvent, ChannelPatterns } from './types.js'
import crypto from 'node:crypto'

/**
 * Event with eventType for backward compatibility
 */
interface CompatibleEvent extends IEvent {
  eventType?: string
}

export class SSEService {
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Subscribe to all domain events
    this.subscribeToAllDomainEvents()

    this.isInitialized = true
    console.log('SSE Service initialized')
  }

  private subscribeToAllDomainEvents(): void {
    // Subscribe to lobby events
    eventBus.subscribe('PlayerJoinedLobby', (event) => this.handleDomainEvent(event as CompatibleEvent))
    eventBus.subscribe('PlayerLeftLobby', (event) => this.handleDomainEvent(event as CompatibleEvent))
    eventBus.subscribe('GameStarted', (event) => this.handleDomainEvent(event as CompatibleEvent))

    // Add more event subscriptions as needed
  }

  private async handleDomainEvent(event: CompatibleEvent): Promise<void> {
    try {
      // Check if we can transform this event
      if (!eventTransformer.canTransform(event)) {
        return
      }

      // Transform domain event to SSE events
      const sseEvents = eventTransformer.transform(event)
      if (sseEvents.length === 0) {
        return
      }

      // Get target channels
      const targetChannels = eventTransformer.getTargetChannels(event)

      // Broadcast to each target channel
      for (const channelName of targetChannels) {
        for (const sseEvent of sseEvents) {
          await channelManager.broadcastToChannel(channelName, sseEvent)
        }
      }

      const eventType = event.eventType ?? event.type
      console.log(
        `Broadcasted ${sseEvents.length} SSE events to ${targetChannels.length} channels for domain event: ${eventType}`
      )
    } catch (error) {
      console.error('Error handling domain event for SSE:', error)
    }
  }

  // Public methods for manual event broadcasting
  async broadcastToLobby(
    lobbyUuid: string,
    event: Omit<SSEEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const sseEvent: SSEEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    }

    await channelManager.broadcastToChannel(ChannelPatterns.lobby(lobbyUuid), sseEvent)
  }

  async broadcastToUser(
    userUuid: string,
    event: Omit<SSEEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const sseEvent: SSEEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    }

    await channelManager.broadcastToChannel(ChannelPatterns.user(userUuid), sseEvent)
  }

  async broadcastToGame(
    gameUuid: string,
    event: Omit<SSEEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const sseEvent: SSEEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    }

    await channelManager.broadcastToChannel(ChannelPatterns.game(gameUuid), sseEvent)
  }

  async broadcastGlobal(event: Omit<SSEEvent, 'id' | 'timestamp'>): Promise<void> {
    const sseEvent: SSEEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event,
    }

    await channelManager.broadcastToChannel(ChannelPatterns.global(), sseEvent)
  }

  // Connection management
  subscribeToLobby(connectionId: string, lobbyUuid: string): boolean {
    return channelManager.subscribeToChannel(ChannelPatterns.lobby(lobbyUuid), connectionId)
  }

  unsubscribeFromLobby(connectionId: string, lobbyUuid: string): boolean {
    return channelManager.unsubscribeFromChannel(ChannelPatterns.lobby(lobbyUuid), connectionId)
  }

  subscribeToUser(connectionId: string, userUuid: string): boolean {
    return channelManager.subscribeToChannel(ChannelPatterns.user(userUuid), connectionId)
  }

  unsubscribeFromUser(connectionId: string, userUuid: string): boolean {
    return channelManager.unsubscribeFromChannel(ChannelPatterns.user(userUuid), connectionId)
  }

  subscribeToGame(connectionId: string, gameUuid: string): boolean {
    return channelManager.subscribeToChannel(ChannelPatterns.game(gameUuid), connectionId)
  }

  unsubscribeFromGame(connectionId: string, gameUuid: string): boolean {
    return channelManager.unsubscribeFromChannel(ChannelPatterns.game(gameUuid), connectionId)
  }

  // Statistics and monitoring
  getStats(): {
    connections: number
    channels: number
    channelStats: Record<string, number>
  } {
    return {
      connections: sseConnectionManager.getActiveConnectionCount(),
      channels: channelManager.getTotalChannelCount(),
      channelStats: channelManager.getChannelStats(),
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    channelManager.cleanup()
    sseConnectionManager.cleanup()
  }

  async destroy(): Promise<void> {
    eventBus.clear()
    sseConnectionManager.destroy()
    this.isInitialized = false
    console.log('SSE Service destroyed')
  }
}

// Singleton instance
export const sseService = new SSEService()
