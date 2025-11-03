import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import { BaseEventHandler, MeasureProcessingTime } from '#domain/events/base/event_handler'
import type { DomainEvent, EventHandlingResult } from '#domain/events/base/domain_event'
import { Result } from '#domain/shared/result'
import type { LobbyDomainEvent } from '#domain/events/lobby/lobby_domain_events'

/**
 * Pont entre le système d'événements et Transmit
 * Responsabilité : Convertir les événements domaine en notifications Transmit temps réel
 */
@inject()
export class TransmitEventBridge extends BaseEventHandler<DomainEvent> {
  readonly name = 'TransmitEventBridge'
  readonly priority = 5 // Priorité moyenne - après persistence et validation

  canHandle(event: DomainEvent): boolean {
    // Ne traiter que les événements qui doivent être diffusés en temps réel
    return this.shouldBroadcast(event)
  }

  @MeasureProcessingTime
  async handle(event: DomainEvent): Promise<Result<EventHandlingResult>> {
    try {
      console.log(`📡 TransmitEventBridge: Broadcasting ${event.type} via Transmit`)

      const transmitData = this.convertToTransmitData(event)

      // Diffuser selon le type d'événement
      await this.broadcastEvent(event, transmitData)

      return Result.ok(
        this.success('Event broadcasted via Transmit successfully', {
          channels: this.getChannelsForEvent(event),
          transmitData,
        })
      )
    } catch (error) {
      console.error(`❌ TransmitEventBridge: Error broadcasting ${event.type}:`, error)

      // Le bridge Transmit ne doit pas faire échouer le traitement global
      // On log l'erreur mais on retourne succès pour ne pas bloquer les autres handlers
      console.warn(`⚠️ TransmitEventBridge: Continuing despite broadcast error for ${event.type}`)

      return Result.ok(
        this.success('Event processing continued despite Transmit error', {
          error: error instanceof Error ? error.message : 'Unknown Transmit error',
        })
      )
    }
  }

  /**
   * Détermine si un événement doit être diffusé via Transmit
   */
  private shouldBroadcast(event: DomainEvent): boolean {
    const broadcastableEvents = [
      'lobby.created',
      'lobby.player.joined',
      'lobby.player.left',
      'lobby.status.changed',
      'lobby.deleted',
      'lobby.game.started',
      // Futurs événements game.*
      'game.state.changed',
      'game.player.action',
      // Futurs événements notification.*
      'notification.sent',
    ]

    return broadcastableEvents.includes(event.type)
  }

  /**
   * Convertit un événement domaine en données Transmit
   */
  private convertToTransmitData(event: DomainEvent): Record<string, any> {
    // Structure commune pour Transmit
    const baseData = {
      type: event.type,
      eventId: event.eventId,
      timestamp: event.metadata.timestamp.toISOString(),
      correlationId: event.metadata.correlationId,
    }

    // Adaptation spécifique selon le type d'événement
    if (event.type.startsWith('lobby.')) {
      return this.convertLobbyEventToTransmit(event as LobbyDomainEvent, baseData)
    }

    // Autres domaines à ajouter plus tard
    return {
      ...baseData,
      ...event.data,
    }
  }

  /**
   * Conversion spécialisée pour les événements lobby
   */
  private convertLobbyEventToTransmit(
    event: LobbyDomainEvent,
    baseData: Record<string, any>
  ): Record<string, any> {
    switch (event.type) {
      case 'lobby.created':
        return {
          ...baseData,
          lobby: {
            uuid: event.data.lobbyUuid,
            name: event.data.name,
            maxPlayers: event.data.maxPlayers,
            isPrivate: event.data.isPrivate,
            currentPlayers: 1, // Le créateur est automatiquement dans le lobby
            createdBy: event.data.createdBy,
            status: 'WAITING',
            hasAvailableSlots: event.data.maxPlayers > 1,
            canStart: false,
            // ✅ ÉTAT COMPLET: Le créateur est déjà dans le lobby
            players: [
              {
                uuid: event.data.creator.uuid,
                nickName: event.data.creator.nickName,
              },
            ],
            createdAt: event.metadata.timestamp.toISOString(),
          },
        }

      case 'lobby.player.joined':
      case 'lobby.player.left':
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
            // ✅ ÉTAT COMPLET: Inclure la liste des joueurs
            players: event.data.lobbyState.players || [],
          },
        }

      case 'lobby.status.changed':
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          oldStatus: event.data.oldStatus,
          newStatus: event.data.newStatus,
          status: event.data.newStatus,
        }

      case 'lobby.deleted':
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          reason: event.data.reason,
        }

      case 'lobby.game.started':
        return {
          ...baseData,
          lobbyUuid: event.data.lobbyUuid,
          gameUuid: event.data.gameUuid,
          players: event.data.players,
        }

      default:
        // Fallback pour futurs événements non gérés
        console.warn('TransmitEventBridge: Unhandled lobby event')
        return baseData
    }
  }

  /**
   * Détermine les canaux Transmit pour un événement
   */
  private getChannelsForEvent(event: DomainEvent): string[] {
    const channels: string[] = []

    if (event.type.startsWith('lobby.')) {
      const lobbyEvent = event as LobbyDomainEvent

      // Canal spécifique au lobby
      channels.push(`lobbies/${lobbyEvent.data.lobbyUuid}`)

      // Canal global des lobbies pour les listes
      if (this.isGlobalLobbyEvent(event.type)) {
        channels.push('lobbies')
      }
    }

    // Futurs canaux pour d'autres domaines
    if (event.type.startsWith('game.')) {
      // channels.push(`games/${event.data.gameUuid}`)
    }

    return channels
  }

  /**
   * Événements qui affectent la liste globale des lobbies
   */
  private isGlobalLobbyEvent(eventType: string): boolean {
    return [
      'lobby.created',
      'lobby.deleted',
      'lobby.player.joined',
      'lobby.player.left',
      'lobby.status.changed',
    ].includes(eventType)
  }

  /**
   * Diffuse l'événement sur les canaux appropriés
   */
  private async broadcastEvent(
    event: DomainEvent,
    transmitData: Record<string, any>
  ): Promise<void> {
    const channels = this.getChannelsForEvent(event)

    for (const channel of channels) {
      try {
        transmit.broadcast(channel, transmitData)
        console.log(`✅ TransmitEventBridge: Successfully broadcasted to channel ${channel}`)
      } catch (error) {
        // Log l'erreur pour ce canal spécifique mais continue avec les autres
        if (
          error.message?.includes('non-existent channel') ||
          error.message?.includes('no subscribers')
        ) {
          console.log(`ℹ️ TransmitEventBridge: No subscribers for channel ${channel}`)
        } else {
          console.error(`❌ TransmitEventBridge: Failed to broadcast to channel ${channel}:`, error)
        }
      }
    }
  }
}

/**
 * Factory pour créer le bridge Transmit avec configuration
 */
export class TransmitEventBridgeFactory {
  static create(): TransmitEventBridge {
    return new TransmitEventBridge()
  }

  /**
   * Créer un bridge avec configuration spécialisée
   */
  static createWithConfig(config: {
    enableRetry?: boolean
    maxRetries?: number
    retryDelayMs?: number
  }): TransmitEventBridge {
    // Pour l'instant, retour du bridge standard
    // La configuration pourra être utilisée plus tard pour des bridges spécialisés
    return new TransmitEventBridge()
  }
}
