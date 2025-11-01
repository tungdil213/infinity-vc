import { inject } from '@adonisjs/core'
import type { DomainEvent, EventHandlingResult } from '#domain/events/base/domain_event'
import { BaseEventHandler, MeasureProcessingTime } from '#domain/events/base/event_handler'
import { Result } from '#domain/shared/result'

/**
 * Handler pour la persistance des événements lobby
 * Responsabilité : Logger et vérifier la cohérence des événements
 * Note: La persistance réelle est déjà faite par les use cases
 */
@inject()
export class LobbyPersistenceHandler extends BaseEventHandler<DomainEvent> {
  readonly name = 'LobbyPersistenceHandler'
  readonly priority = 0 // Haute priorité - doit être traité en premier

  constructor() {
    super()
  }

  canHandle(event: DomainEvent): boolean {
    return event.type.startsWith('lobby.') && !event.type.includes('game.started')
  }

  @MeasureProcessingTime
  async handle(event: DomainEvent): Promise<Result<EventHandlingResult>> {
    try {
      console.log(`💾 LobbyPersistenceHandler: Handling ${event.type}`)

      switch (event.type) {
        case 'lobby.created':
          // Le lobby est déjà créé et sauvé dans le use case
          // Ici on pourrait ajouter des logs, metrics, etc.
          break

        case 'lobby.player.joined':
        case 'lobby.player.left':
          // Les changements de joueurs sont déjà persistés
          // Ici on pourrait ajouter des audits spécifiques
          break

        case 'lobby.status.changed':
          // Le changement de statut est déjà persisté par le use case
          console.log(
            `📝 LobbyPersistenceHandler: Status changed for lobby ${event.data.lobbyUuid}: ${event.data.oldStatus} → ${event.data.newStatus}`
          )
          break

        case 'lobby.deleted':
          // La suppression est déjà faite par le use case
          console.log(`🗑️ LobbyPersistenceHandler: Lobby ${event.data.lobbyUuid} deleted`)
          break

        default:
          console.log(`🤷 LobbyPersistenceHandler: Unknown event type ${event.type}`)
      }

      return Result.ok(this.success('Lobby persistence handled successfully', event.data))
    } catch (error) {
      console.error(`❌ LobbyPersistenceHandler: Error handling ${event.type}:`, error)
      return Result.fail(
        this.failure(error instanceof Error ? error.message : 'Unknown persistence error').message!
      )
    }
  }
}

/**
 * Handler pour la validation des règles métier
 * Responsabilité : Vérifier que les événements respectent les règles du domaine
 */
@inject()
export class LobbyBusinessRulesHandler extends BaseEventHandler<DomainEvent> {
  readonly name = 'LobbyBusinessRulesHandler'
  readonly priority = 1 // Priorité élevée - validation avant autres actions

  canHandle(event: DomainEvent): boolean {
    return event.type.startsWith('lobby.')
  }

  @MeasureProcessingTime
  async handle(event: DomainEvent): Promise<Result<EventHandlingResult>> {
    try {
      console.log(`🔍 LobbyBusinessRulesHandler: Validating ${event.type}`)

      const validationResult = await this.validateBusinessRules(event)

      if (!validationResult.isValid) {
        console.warn(`⚠️ Business rule violation for ${event.type}: ${validationResult.reason}`)
        // Ici on pourrait déclencher des événements de compensation
      }

      return Result.ok(
        this.success('Business rules validation completed', {
          isValid: validationResult.isValid,
          reason: validationResult.reason,
        })
      )
    } catch (error) {
      console.error(`❌ LobbyBusinessRulesHandler: Error validating ${event.type}:`, error)
      return Result.fail(
        this.failure(error instanceof Error ? error.message : 'Unknown validation error').message!
      )
    }
  }

  private async validateBusinessRules(event: DomainEvent): Promise<{
    isValid: boolean
    reason?: string
  }> {
    switch (event.type) {
      case 'lobby.player.joined':
        if (event.data.lobbyState.currentPlayers > event.data.lobbyState.maxPlayers) {
          return { isValid: false, reason: 'Lobby exceeds maximum players' }
        }
        break

      case 'lobby.player.left':
        if (event.data.lobbyState.currentPlayers < 0) {
          return { isValid: false, reason: 'Negative player count' }
        }
        break

      case 'lobby.status.changed':
        const validTransitions = this.getValidStatusTransitions()
        const { oldStatus, newStatus } = event.data

        if (!validTransitions[oldStatus]?.includes(newStatus)) {
          return {
            isValid: false,
            reason: `Invalid status transition from ${oldStatus} to ${newStatus}`,
          }
        }
        break

      default:
        // Autres validations si nécessaire
        break
    }

    return { isValid: true }
  }

  private getValidStatusTransitions(): Record<string, string[]> {
    return {
      WAITING: ['READY', 'CANCELLED'],
      READY: ['STARTING', 'WAITING', 'CANCELLED'],
      STARTING: ['IN_GAME', 'CANCELLED'],
      IN_GAME: ['PAUSED', 'FINISHED'],
      PAUSED: ['IN_GAME', 'CANCELLED'],
      FINISHED: [],
      CANCELLED: [],
    }
  }
}

/**
 * Handler pour les métriques et analytics
 * Responsabilité : Collecter des données sur l'utilisation des lobbies
 */
@inject()
export class LobbyAnalyticsHandler extends BaseEventHandler<DomainEvent> {
  readonly name = 'LobbyAnalyticsHandler'
  readonly priority = 10 // Basse priorité - peut être exécuté en dernier

  canHandle(event: DomainEvent): boolean {
    return event.type.startsWith('lobby.')
  }

  @MeasureProcessingTime
  async handle(event: DomainEvent): Promise<Result<EventHandlingResult>> {
    try {
      console.log(`📊 LobbyAnalyticsHandler: Recording analytics for ${event.type}`)

      // Simuler l'enregistrement d'analytics
      const analyticsData = this.extractAnalyticsData(event)

      // Ici on pourrait envoyer vers un service d'analytics externe
      // await this.analyticsService.track(event.type, analyticsData)

      console.log(`📊 Analytics recorded:`, analyticsData)

      return Result.ok(this.success('Analytics recorded successfully', analyticsData))
    } catch (error) {
      console.error(`❌ LobbyAnalyticsHandler: Error recording analytics:`, error)
      return Result.fail(
        this.failure(error instanceof Error ? error.message : 'Unknown analytics error').message!
      )
    }
  }

  private extractAnalyticsData(event: DomainEvent): Record<string, any> {
    const baseData = {
      eventType: event.type,
      timestamp: event.metadata.timestamp,
      correlationId: event.metadata.correlationId,
    }

    switch (event.type) {
      case 'lobby.created':
        return {
          ...baseData,
          lobbyType: event.data.isPrivate ? 'private' : 'public',
          maxPlayers: event.data.maxPlayers,
        }

      case 'lobby.player.joined':
      case 'lobby.player.left':
        return {
          ...baseData,
          currentPlayers: event.data.lobbyState.currentPlayers,
          maxPlayers: event.data.lobbyState.maxPlayers,
          fillRate: event.data.lobbyState.currentPlayers / event.data.lobbyState.maxPlayers,
        }

      case 'lobby.game.started':
        return {
          ...baseData,
          playerCount: event.data.players.length,
        }

      default:
        return baseData
    }
  }
}
