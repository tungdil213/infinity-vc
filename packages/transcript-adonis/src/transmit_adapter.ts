import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type { IChannel } from '@infinity.dev/transcript'
import type { ITranscriptService, TranscriptServiceStats } from '@infinity.dev/transcript/server'

export class TransmitAdapter implements ITranscriptService {
  private channels: Map<string, IChannel> = new Map()
  private totalMessagesSent: number = 0

  async initialize(): Promise<void> {
    logger.info('[TransmitAdapter] Initialized')
  }

  registerChannel(channel: IChannel): void {
    this.channels.set(channel.id, channel)
    logger.debug({ channelId: channel.id }, '[TransmitAdapter] Registered channel')
  }

  async broadcast<TPayload>(channel: string, type: string, payload: TPayload): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        type,
        timestamp: new Date().toISOString(),
      }

      if (typeof payload === 'object' && payload !== null) {
        Object.assign(data, payload)
      } else {
        data.data = payload
      }

      transmit.broadcast(channel, data as any)
      this.totalMessagesSent++
      logger.debug({ channel, eventType: type }, '[TransmitAdapter] Broadcasted event')
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message?.includes('non-existent channel') ||
          error.message?.includes('no subscribers'))
      ) {
        logger.debug({ channel }, '[TransmitAdapter] No subscribers for channel')
      } else {
        logger.error({ channel, eventType: type, error }, '[TransmitAdapter] Failed to broadcast')
      }
    }
  }

  async sendToConnection<TPayload>(
    _connectionId: string,
    _type: string,
    _payload: TPayload
  ): Promise<void> {
    logger.warn('[TransmitAdapter] sendToConnection not supported, use sendToUser instead')
  }

  async sendToUser<TPayload>(userId: string, type: string, payload: TPayload): Promise<void> {
    const channel = `users/${userId}`
    await this.broadcast(channel, type, payload)
  }

  getSubscriberCount(_channel: string): number {
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
    logger.info('[TransmitAdapter] Destroyed')
  }
}

export const transmitAdapter = new TransmitAdapter()
