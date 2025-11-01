import { DomainEvent, EventHandlingResult } from './domain_event.js'
import { Result } from '../../shared/result.js'

/**
 * Interface de base pour tous les handlers d'événements
 * Centralise la logique de traitement des événements par domaine
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  /**
   * Nom unique du handler pour identification
   */
  readonly name: string

  /**
   * Priorité d'exécution (0 = plus haute priorité)
   * Permet d'ordonner les handlers pour un même événement
   */
  readonly priority: number

  /**
   * Détermine si ce handler peut traiter l'événement donné
   */
  canHandle(event: DomainEvent): boolean

  /**
   * Traite l'événement et retourne le résultat
   * Doit respecter les principes SOLID et DDD
   */
  handle(event: T): Promise<Result<EventHandlingResult>>

  /**
   * Hook appelé après le traitement réussi (optionnel)
   * Utile pour des actions post-traitement comme la notification
   */
  onSuccess?(event: T, result: EventHandlingResult): Promise<void>

  /**
   * Hook appelé en cas d'échec du traitement (optionnel)
   * Utile pour le logging, retry logic, compensation
   */
  onError?(event: T, error: Error): Promise<void>
}

/**
 * Handler abstrait avec implémentation par défaut des hooks
 * Fournit une base solide pour créer des handlers spécialisés
 */
export abstract class BaseEventHandler<T extends DomainEvent = DomainEvent>
  implements EventHandler<T>
{
  abstract readonly name: string
  abstract readonly priority: number

  abstract canHandle(event: DomainEvent): boolean
  abstract handle(event: T): Promise<Result<EventHandlingResult>>

  async onSuccess(event: T, result: EventHandlingResult): Promise<void> {
    console.log(`✅ ${this.name}: Event ${event.type} processed successfully`, {
      eventId: event.eventId,
      processingTime: result.processingTimeMs,
    })
  }

  async onError(event: T, error: Error): Promise<void> {
    console.error(`❌ ${this.name}: Failed to process event ${event.type}`, {
      eventId: event.eventId,
      error: error.message,
      retryCount: event.metadata.retryCount,
    })
  }

  /**
   * Utilitaire pour créer un résultat de succès
   */
  protected success(
    message?: string,
    data?: any,
    processingTimeMs: number = 0,
    generatedEvents?: DomainEvent[]
  ): EventHandlingResult {
    return {
      handlerName: this.name,
      success: true,
      message,
      data,
      processingTimeMs,
      generatedEvents,
    }
  }

  /**
   * Utilitaire pour créer un résultat d'échec
   */
  protected failure(message: string, processingTimeMs: number = 0): EventHandlingResult {
    return {
      handlerName: this.name,
      success: false,
      message,
      processingTimeMs,
    }
  }
}

/**
 * Décorateur pour mesurer automatiquement le temps de traitement
 */
export function MeasureProcessingTime<T extends DomainEvent = DomainEvent>(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value

  descriptor.value = async function (event: T): Promise<Result<EventHandlingResult>> {
    const startTime = performance.now()

    try {
      const result = await originalMethod.call(this, event)
      const processingTimeMs = performance.now() - startTime

      if (result.isSuccess) {
        result.value.processingTimeMs = processingTimeMs
      }

      return result
    } catch (error) {
      const processingTimeMs = performance.now() - startTime
      return Result.fail(
        JSON.stringify({
          handlerName: (this as EventHandler).name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs,
        })
      )
    }
  }

  return descriptor
}

/**
 * Types utilitaires pour les handlers spécialisés
 */
export type LobbyEventHandler = EventHandler<DomainEvent>
export type PlayerEventHandler = EventHandler<DomainEvent>
export type GameEventHandler = EventHandler<DomainEvent>
export type NotificationEventHandler = EventHandler<DomainEvent>
