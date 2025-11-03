import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import { BaseModuleEventBridge } from '../../base/module_event_bridge.js'
import type { ModuleEvent } from '../../base/module_event.js'
import { LOBBY_EVENT_TYPES } from './lobby_events.js'

/**
 * Bridge Transmit spécifique pour les événements lobby
 * Gère la diffusion temps réel des événements lobby via Transmit
 */
@inject()
export class LobbyTransmitBridge extends BaseModuleEventBridge {
  readonly moduleName = 'lobby'
  readonly priority = 5

  private broadcastableEvents = [
    LOBBY_EVENT_TYPES.CREATED,
    LOBBY_EVENT_TYPES.PLAYER_JOINED,
    LOBBY_EVENT_TYPES.PLAYER_LEFT,
    LOBBY_EVENT_TYPES.STATUS_CHANGED,
    LOBBY_EVENT_TYPES.DELETED,
    LOBBY_EVENT_TYPES.GAME_STARTED,
  ]

  protected shouldBroadcast(event: ModuleEvent): boolean {
    return this.broadcastableEvents.includes(event.type as any)
  }

  async handle(event: ModuleEvent): Promise<void> {
    try {
      console.log(`📡 LobbyTransmitBridge: Broadcasting ${event.type}`)

      const transmitData = this.transformEvent(event)
      const channels = this.getChannels(event)

      for (const channel of channels) {
        try {
          transmit.broadcast(channel, transmitData)
          console.log(`✅ LobbyTransmitBridge: Broadcasted to ${channel}`)
        } catch (error: any) {
          if (
            error.message?.includes('non-existent channel') ||
            error.message?.includes('no subscribers')
          ) {
            console.log(`ℹ️ LobbyTransmitBridge: No subscribers for ${channel}`)
          } else {
            console.error(`❌ LobbyTransmitBridge: Failed to broadcast to ${channel}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`❌ LobbyTransmitBridge: Error broadcasting ${event.type}:`, error)
      // Ne pas rejeter - les erreurs de diffusion ne doivent pas bloquer le traitement
    }
  }

  getChannels(event: ModuleEvent): string[] {
    const channels: string[] = []
    const lobbyUuid = event.data.lobbyUuid

    if (lobbyUuid) {
      channels.push(`lobbies/${lobbyUuid}`)
    }

    // Événements qui affectent la liste globale
    if (this.isGlobalLobbyEvent(event.type)) {
      channels.push('lobbies')
    }

    return channels
  }

  transformEvent(event: ModuleEvent): Record<string, any> {
    const baseData = this.createBaseTransmitData(event)

    switch (event.type) {
      case LOBBY_EVENT_TYPES.CREATED:
        return {
          ...baseData,
          lobby: {
            uuid: event.data.lobbyUuid,
            name: event.data.name,
            maxPlayers: event.data.maxPlayers,
            isPrivate: event.data.isPrivate,
            currentPlayers: 1,
            createdBy: event.data.createdBy,
            status: 'WAITING',
            hasAvailableSlots: event.data.maxPlayers > 1,
            canStart: false,
            players: [
              {
                uuid: event.data.creator.uuid,
                nickName: event.data.creator.nickName,
              },
            ],
            createdAt: event.metadata.timestamp.toISOString(),
          },
        }

      case LOBBY_EVENT_TYPES.PLAYER_JOINED:
      case LOBBY_EVENT_TYPES.PLAYER_LEFT:
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          player: event.data.player,
          playerCount: event.data.lobbyState.currentPlayers,
          lobby: {
            uuid: event.data.lobbyUuid,
            currentPlayers: event.data.lobbyState.currentPlayers,
            maxPlayers: event.data.lobbyState.maxPlayers,
            canStart: event.data.lobbyState.canStart,
            status: event.data.lobbyState.status,
            players: event.data.lobbyState.players || [],
          },
        }

      case LOBBY_EVENT_TYPES.STATUS_CHANGED:
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          oldStatus: event.data.oldStatus,
          newStatus: event.data.newStatus,
          status: event.data.newStatus,
        }

      case LOBBY_EVENT_TYPES.DELETED:
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          reason: event.data.reason,
        }

      case LOBBY_EVENT_TYPES.GAME_STARTED:
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          gameUuid: event.data.gameUuid,
          players: event.data.players,
        }

      default:
        return baseData
    }
  }

  private isGlobalLobbyEvent(eventType: string): boolean {
    return [
      LOBBY_EVENT_TYPES.CREATED,
      LOBBY_EVENT_TYPES.DELETED,
      LOBBY_EVENT_TYPES.PLAYER_JOINED,
      LOBBY_EVENT_TYPES.PLAYER_LEFT,
      LOBBY_EVENT_TYPES.STATUS_CHANGED,
    ].includes(eventType as any)
  }
}
