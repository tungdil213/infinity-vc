import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import { BaseModuleEventBridge } from '../../base/module_event_bridge.js'
import type { ModuleEvent } from '../../base/module_event.js'
import { GAME_EVENT_TYPES } from './game_events.js'

/**
 * Bridge Transmit pour les événements game
 */
@inject()
export class GameTransmitBridge extends BaseModuleEventBridge {
  readonly moduleName = 'game'
  readonly priority = 5

  async handle(event: ModuleEvent): Promise<void> {
    try {
      console.log(`📡 GameTransmitBridge: Broadcasting ${event.type}`)

      const transmitData = this.transformEvent(event)
      const channels = this.getChannels(event)

      for (const channel of channels) {
        try {
          transmit.broadcast(channel, transmitData)
          console.log(`✅ GameTransmitBridge: Broadcasted to ${channel}`)
        } catch (error: any) {
          if (
            error.message?.includes('non-existent channel') ||
            error.message?.includes('no subscribers')
          ) {
            console.log(`ℹ️ GameTransmitBridge: No subscribers for ${channel}`)
          } else {
            console.error(`❌ GameTransmitBridge: Failed to broadcast to ${channel}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`❌ GameTransmitBridge: Error broadcasting ${event.type}:`, error)
    }
  }

  getChannels(event: ModuleEvent): string[] {
    const gameUuid = event.data.gameUuid
    return gameUuid ? [`games/${gameUuid}`] : []
  }

  transformEvent(event: ModuleEvent): Record<string, any> {
    const baseData = this.createBaseTransmitData(event)

    switch (event.type) {
      case GAME_EVENT_TYPES.STARTED:
        return {
          ...baseData,
          game: {
            uuid: event.data.gameUuid,
            type: event.data.gameType,
            players: event.data.playerUuids,
            state: event.data.initialState,
          },
        }

      case GAME_EVENT_TYPES.STATE_CHANGED:
        return {
          ...baseData,
          gameUuid: event.data.gameUuid,
          state: event.data.newState,
          changedBy: event.data.changedBy,
        }

      case GAME_EVENT_TYPES.PLAYER_ACTION:
        return {
          ...baseData,
          gameUuid: event.data.gameUuid,
          player: event.data.playerUuid,
          action: event.data.action,
          state: event.data.resultingState,
        }

      case GAME_EVENT_TYPES.TURN_CHANGED:
        return {
          ...baseData,
          gameUuid: event.data.gameUuid,
          currentPlayer: event.data.currentPlayerUuid,
          turnNumber: event.data.turnNumber,
        }

      case GAME_EVENT_TYPES.FINISHED:
        return {
          ...baseData,
          gameUuid: event.data.gameUuid,
          winner: event.data.winnerUuid,
          finalState: event.data.finalState,
          reason: event.data.reason,
        }

      default:
        return baseData
    }
  }
}
