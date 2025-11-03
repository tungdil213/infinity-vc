import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import { BaseModuleEventBridge } from '../../base/module_event_bridge.js'
import type { ModuleEvent } from '../../base/module_event.js'
import { CHAT_EVENT_TYPES } from './chat_events.js'

/**
 * Bridge Transmit pour les événements chat
 */
@inject()
export class ChatTransmitBridge extends BaseModuleEventBridge {
  readonly moduleName = 'chat'
  readonly priority = 5

  async handle(event: ModuleEvent): Promise<void> {
    try {
      console.log(`📡 ChatTransmitBridge: Broadcasting ${event.type}`)

      const transmitData = this.transformEvent(event)
      const channels = this.getChannels(event)

      for (const channel of channels) {
        try {
          transmit.broadcast(channel, transmitData)
          console.log(`✅ ChatTransmitBridge: Broadcasted to ${channel}`)
        } catch (error: any) {
          if (
            error.message?.includes('non-existent channel') ||
            error.message?.includes('no subscribers')
          ) {
            console.log(`ℹ️ ChatTransmitBridge: No subscribers for ${channel}`)
          } else {
            console.error(`❌ ChatTransmitBridge: Failed to broadcast to ${channel}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`❌ ChatTransmitBridge: Error broadcasting ${event.type}:`, error)
    }
  }

  getChannels(event: ModuleEvent): string[] {
    const channelId = event.data.channelId
    return channelId ? [`chat/${channelId}`] : []
  }

  transformEvent(event: ModuleEvent): Record<string, any> {
    const baseData = this.createBaseTransmitData(event)

    switch (event.type) {
      case CHAT_EVENT_TYPES.MESSAGE_SENT:
        return {
          ...baseData,
          message: {
            id: event.data.messageId,
            content: event.data.content,
            author: {
              uuid: event.data.authorUuid,
              name: event.data.authorName,
            },
            timestamp: event.data.timestamp,
          },
        }

      case CHAT_EVENT_TYPES.USER_TYPING:
        return {
          ...baseData,
          user: {
            uuid: event.data.userUuid,
            name: event.data.userName,
          },
        }

      default:
        return baseData
    }
  }
}
