import type { DomainEvent } from '#shared_kernel/domain/events/domain_event'
import transmit from '@adonisjs/transmit/services/main'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('TransmitBridge')

/**
 * Bridge générique entre EventBus et Transmit
 * Transforme les événements DDD en messages Transmit pour diffusion temps réel
 *
 * Pattern: EventBusService → TransmitBridge → Transmit → Clients WebSocket
 */
export class TransmitBridgeService {
  /**
   * Handle un événement DDD et le diffuse via Transmit
   * Compatible avec EventHandler: (event: DomainEvent) => Promise<void> | void
   */
  async handle(event: DomainEvent): Promise<void> {
    try {
      const channels = this.getChannels(event)
      const payload = this.transformEvent(event)

      logger.debug(
        { eventName: event.eventName, channels, eventId: event.eventId },
        'Broadcasting event to channels'
      )

      for (const channel of channels) {
        try {
          transmit.broadcast(channel, payload)
          logger.debug({ channel, eventName: event.eventName }, 'Event broadcasted successfully')
        } catch (error: any) {
          if (this.isNoSubscriberError(error)) {
            logger.debug({ channel }, 'No subscribers on channel (expected if no clients)')
          } else {
            logger.error(
              { error, channel, eventName: event.eventName },
              'Failed to broadcast to channel'
            )
          }
        }
      }
    } catch (error) {
      logger.error(
        { error, eventName: event.eventName, eventId: event.eventId },
        'Failed to broadcast event'
      )
      // Ne pas rejeter - les erreurs de diffusion ne doivent pas bloquer le traitement métier
    }
  }

  /**
   * Détermine les canaux Transmit pour un événement donné
   */
  private getChannels(event: DomainEvent): string[] {
    const eventName = event.eventName
    const channels: string[] = []

    // Événements Lobby
    if (eventName.startsWith('lobby.')) {
      const lobbyId = event.payload.lobbyId || event.payload.lobbyUuid

      if (lobbyId) {
        // Canal spécifique au lobby
        channels.push(`lobbies/${lobbyId}`)
      }

      // Événements qui affectent la liste globale des lobbies
      if (this.isGlobalLobbyEvent(eventName)) {
        channels.push('lobbies')
      }
    }

    // Événements Game
    if (eventName.startsWith('game.')) {
      const gameId = event.payload.gameId || event.payload.gameUuid

      if (gameId) {
        // Canal spécifique au jeu
        channels.push(`games/${gameId}`)
      }

      // Si le jeu est lié à un lobby
      const lobbyId = event.payload.lobbyId || event.payload.lobbyUuid
      if (lobbyId) {
        channels.push(`lobbies/${lobbyId}`)
      }
    }

    // Événements User/IAM
    if (eventName.startsWith('user.')) {
      const userId = event.payload.userId || event.payload.userUuid

      if (userId) {
        channels.push(`users/${userId}`)
      }
    }

    return channels
  }

  /**
   * Transforme un DomainEvent en payload Transmit
   */
  private transformEvent(event: DomainEvent): Record<string, any> {
    return {
      type: event.eventName,
      eventId: event.eventId,
      occurredOn: event.occurredOn.toISOString(),
      ...event.payload,
    }
  }

  /**
   * Vérifie si l'événement lobby doit être diffusé globalement
   */
  private isGlobalLobbyEvent(eventName: string): boolean {
    return [
      'lobby.created',
      'lobby.deleted',
      'lobby.player.joined',
      'lobby.player.left',
      'lobby.status.changed',
    ].includes(eventName)
  }

  /**
   * Vérifie si l'erreur indique l'absence de souscripteurs (normal)
   */
  private isNoSubscriberError(error: any): boolean {
    const message = error?.message || ''
    return (
      message.includes('non-existent channel') ||
      message.includes('no subscribers') ||
      message.includes('channel not found')
    )
  }
}
