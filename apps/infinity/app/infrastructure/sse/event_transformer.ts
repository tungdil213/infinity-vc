import { EventTransformer, SSEEvent, ChannelPatterns, SSEEventTypes } from './types.js'
import { DomainEvent } from '../../domain/events/domain_event.js'
import {
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
  GameStartedEvent,
  LobbyCreatedEvent,
  LobbyUpdatedEvent,
  LobbyDeletedEvent,
} from '../../domain/events/lobby_events.js'
import crypto from 'node:crypto'

export class LobbyEventTransformer implements EventTransformer {
  transform(domainEvent: DomainEvent): SSEEvent[] {
    const events: SSEEvent[] = []

    switch (domainEvent.eventType) {
      case 'PlayerJoinedLobby':
        events.push(...this.transformPlayerJoinedLobby(domainEvent as PlayerJoinedLobbyEvent))
        break

      case 'PlayerLeftLobby':
        events.push(...this.transformPlayerLeftLobby(domainEvent as PlayerLeftLobbyEvent))
        break

      case 'GameStarted':
        events.push(...this.transformGameStarted(domainEvent as GameStartedEvent))
        break
    }

    return events
  }

  getTargetChannels(domainEvent: DomainEvent): string[] {
    switch (domainEvent.eventType) {
      case 'PlayerJoinedLobby':
      case 'PlayerLeftLobby':
      case 'GameStarted':
        const lobbyEvent = domainEvent as
          | PlayerJoinedLobbyEvent
          | PlayerLeftLobbyEvent
          | GameStartedEvent
        return [
          ChannelPatterns.lobby(lobbyEvent.lobbyUuid),
          ChannelPatterns.user(lobbyEvent.player?.uuid || (lobbyEvent as any).players?.[0]?.uuid),
        ].filter(Boolean)

      default:
        return []
    }
  }

  canTransform(domainEvent: DomainEvent): boolean {
    return ['PlayerJoinedLobby', 'PlayerLeftLobby', 'GameStarted'].includes(domainEvent.eventType)
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

  transform(domainEvent: DomainEvent): SSEEvent[] {
    const allEvents: SSEEvent[] = []

    for (const transformer of this.transformers) {
      if (transformer.canTransform(domainEvent)) {
        allEvents.push(...transformer.transform(domainEvent))
      }
    }

    return allEvents
  }

  getTargetChannels(domainEvent: DomainEvent): string[] {
    const allChannels: string[] = []

    for (const transformer of this.transformers) {
      if (transformer.canTransform(domainEvent)) {
        allChannels.push(...transformer.getTargetChannels(domainEvent))
      }
    }

    // Remove duplicates
    return Array.from(new Set(allChannels))
  }

  canTransform(domainEvent: DomainEvent): boolean {
    return this.transformers.some((transformer) => transformer.canTransform(domainEvent))
  }
}

// Singleton instance
export const eventTransformer = new CompositeEventTransformer()
