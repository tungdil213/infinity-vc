/**
 * Transmit Adapter
 *
 * Implements the ITranscriptService interface using AdonisJS Transmit.
 * This allows us to use the @tyfo.dev/transcript EventBridge with Transmit.
 */
import transmit from '@adonisjs/transmit/services/main'
import type { ITranscriptService, TranscriptServiceStats } from '@tyfo.dev/transcript/server'
import type { IChannel } from '@tyfo.dev/transcript'

/**
 * Transmit adapter implementing ITranscriptService
 */
export class TransmitAdapter implements ITranscriptService {
  private channels: Map<string, IChannel> = new Map()
  private totalMessagesSent: number = 0

  async initialize(): Promise<void> {
    console.log('[TransmitAdapter] Initialized')
  }

  registerChannel(channel: IChannel): void {
    this.channels.set(channel.id, channel)
    console.log(`[TransmitAdapter] Registered channel: ${channel.id}`)
  }

  async broadcast<TPayload>(channel: string, type: string, payload: TPayload): Promise<void> {
    try {
      // Convert payload to Transmit-compatible format
      const data: Record<string, unknown> = {
        type,
        timestamp: new Date().toISOString(),
      }

      // Merge payload if it's an object, otherwise wrap it
      if (typeof payload === 'object' && payload !== null) {
        Object.assign(data, payload)
      } else {
        data.data = payload
      }

      transmit.broadcast(channel, data as any)
      this.totalMessagesSent++
      console.log(`[TransmitAdapter] Broadcasted ${type} to ${channel}`)
    } catch (error) {
      // Don't treat as critical error if no subscribers
      if (
        error instanceof Error &&
        (error.message?.includes('non-existent channel') ||
          error.message?.includes('no subscribers'))
      ) {
        console.log(`[TransmitAdapter] No subscribers for channel ${channel}`)
      } else {
        console.error(`[TransmitAdapter] Failed to broadcast to ${channel}:`, error)
      }
    }
  }

  async sendToConnection<TPayload>(
    _connectionId: string,
    _type: string,
    _payload: TPayload
  ): Promise<void> {
    // Transmit doesn't support direct connection messaging
    console.warn('[TransmitAdapter] sendToConnection not supported, use sendToUser instead')
  }

  async sendToUser<TPayload>(userId: string, type: string, payload: TPayload): Promise<void> {
    const channel = `users/${userId}`
    await this.broadcast(channel, type, payload)
  }

  getSubscriberCount(_channel: string): number {
    // Transmit doesn't expose subscriber count directly
    return 0
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  getStats(): TranscriptServiceStats {
    return {
      activeConnections: 0,
      activeChannels: this.channels.size,
      totalMessagesSent: this.totalMessagesSent,
      connectionsByUser: new Map(),
    }
  }

  async destroy(): Promise<void> {
    console.log('[TransmitAdapter] Destroyed')
  }
}

// Singleton instance
export const transmitAdapter = new TransmitAdapter()
