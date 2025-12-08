import { EventTransformer, SSEEvent, ChannelPatterns, SSEEventTypes } from './types.js'
import {
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
  GameStartedEvent,
} from '../../domain/events/lobby_events.js'
import crypto from 'node:crypto'

/**
 * Get event type from either eventType (legacy) or type (new)
 */
function getEventType(event: any): string {
  return event.eventType ?? event.type
}

export class LobbyEventTransformer implements EventTransformer {
  transform(event: any): SSEEvent[] {
    const events: SSEEvent[] = []
    const eventType = getEventType(event)

    switch (eventType) {
      case 'PlayerJoinedLobby':
        events.push(...this.transformPlayerJoinedLobby(event as PlayerJoinedLobbyEvent))
        break

      case 'PlayerLeftLobby':
        events.push(...this.transformPlayerLeftLobby(event as PlayerLeftLobbyEvent))
        break

      case 'GameStarted':
        events.push(...this.transformGameStarted(event as GameStartedEvent))
        break
    }

    return events
  }

  getTargetChannels(event: any): string[] {
    const eventType = getEventType(event)

    switch (eventType) {
      case 'PlayerJoinedLobby':
      case 'PlayerLeftLobby': {
        const playerEvent = event as PlayerJoinedLobbyEvent | PlayerLeftLobbyEvent
        return [
          ChannelPatterns.lobby(playerEvent.lobbyUuid),
          ChannelPatterns.user(playerEvent.player?.uuid),
        ].filter(Boolean) as string[]
      }
      case 'GameStarted': {
        const gameEvent = event as GameStartedEvent
        return [
          ChannelPatterns.lobby(gameEvent.lobbyUuid),
          ...(gameEvent.players?.map((p) => ChannelPatterns.user(p.uuid)) || []),
        ].filter(Boolean)
      }
      default:
        return []
    }
  }

  canTransform(event: any): boolean {
    const eventType = getEventType(event)
    return ['PlayerJoinedLobby', 'PlayerLeftLobby', 'GameStarted'].includes(eventType)
  }

  private transformPlayerJoinedLobby(event: PlayerJoinedLobbyEvent): SSEEvent[] {
    const baseEvent = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
    }

    return [
      // Event for all lobby members
      {
        ...baseEvent,
        type: SSEEventTypes.LOBBY_PLAYER_JOINED,
        data: {
          lobbyUuid: event.lobbyUuid,
          player: event.player,
          playerCount: event.playerCount,
          lobbyStatus: event.lobbyStatus,
        },
      },
      // Personal confirmation for the joining player
      {
        ...baseEvent,
        id: crypto.randomUUID(),
        type: SSEEventTypes.USER_NOTIFICATION,
        data: {
          type: 'lobby_joined',
          message: `You joined the lobby`,
          lobbyUuid: event.lobbyUuid,
          playerCount: event.playerCount,
        },
      },
    ]
  }

  private transformPlayerLeftLobby(event: PlayerLeftLobbyEvent): SSEEvent[] {
    const baseEvent = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
    }

    return [
      // Event for remaining lobby members
      {
        ...baseEvent,
        type: SSEEventTypes.LOBBY_PLAYER_LEFT,
        data: {
          lobbyUuid: event.lobbyUuid,
          player: event.player,
          playerCount: event.playerCount,
          lobbyStatus: event.lobbyStatus,
        },
      },
      // Personal confirmation for the leaving player
      {
        ...baseEvent,
        id: crypto.randomUUID(),
        type: SSEEventTypes.USER_NOTIFICATION,
        data: {
          type: 'lobby_left',
          message: `You left the lobby`,
          lobbyUuid: event.lobbyUuid,
        },
      },
    ]
  }

  private transformGameStarted(event: GameStartedEvent): SSEEvent[] {
    const baseEvent = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
    }

    return [
      // Event for all lobby members
      {
        ...baseEvent,
        type: SSEEventTypes.LOBBY_GAME_STARTED,
        data: {
          lobbyUuid: event.lobbyUuid,
          gameUuid: event.gameUuid,
          players: event.players,
        },
      },
    ]
  }
}

export class CompositeEventTransformer implements EventTransformer {
  private transformers: EventTransformer[] = []

  constructor() {
    this.transformers.push(new LobbyEventTransformer())
  }

  addTransformer(transformer: EventTransformer): void {
    this.transformers.push(transformer)
  }

  transform(event: any): SSEEvent[] {
    const allEvents: SSEEvent[] = []

    for (const transformer of this.transformers) {
      if (transformer.canTransform(event)) {
        allEvents.push(...transformer.transform(event))
      }
    }

    return allEvents
  }

  getTargetChannels(event: any): string[] {
    const allChannels: string[] = []

    for (const transformer of this.transformers) {
      if (transformer.canTransform(event)) {
        allChannels.push(...transformer.getTargetChannels(event))
      }
    }

    // Remove duplicates
    return Array.from(new Set(allChannels))
  }

  canTransform(event: any): boolean {
    return this.transformers.some((transformer) => transformer.canTransform(event))
  }
}

// Singleton instance
export const eventTransformer = new CompositeEventTransformer()
