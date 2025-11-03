import { DomainEvent, EventHandlingResult } from '#domain/events/base/domain_event'
import { EventHandler } from '#domain/events/base/event_handler'
import { Result } from '#domain/shared/result'

/**
 * Interface du Event Bus central
 * Responsable de la distribution et du traitement des événements dans l'architecture Event-Driven
 */
export interface EventBus {
  /**
   * Publier un événement de manière asynchrone
   * Les handlers sont exécutés en parallèle selon leur priorité
   */
  publish<T extends DomainEvent>(event: T): Promise<Result<void>>

  /**
   * Publier un événement et attendre tous les résultats
   * Utile pour les cas où on a besoin de connaître les résultats de tous les handlers
   */
  publishAndWait<T extends DomainEvent>(event: T): Promise<Result<EventHandlingResult[]>>

  /**
   * S'abonner à un type d'événement avec un handler
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): UnsubscribeFunction

  /**
   * S'abonner à plusieurs types d'événements avec un handler
   */
  subscribeToMultiple<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>
  ): UnsubscribeFunction

  /**
   * Désabonner tous les handlers d'un type d'événement
   */
  unsubscribeAll(eventType: string): void

  /**
   * Obtenir les statistiques du bus d'événements
   */
  getStats(): EventBusStats

  /**
   * Nettoyer et réinitialiser le bus
   */
  clear(): void
}

/**
 * Fonction de désabonnement
 */
export type UnsubscribeFunction = () => void

/**
 * Statistiques du bus d'événements
 */
export interface EventBusStats {
  totalSubscriptions: number
  eventTypesCount: number
  eventsProcessed: number
  eventsPublished: number
  errorCount: number
  averageProcessingTimeMs: number
  handlerStats: Array<{
    handlerName: string
    eventsProcessed: number
    averageProcessingTimeMs: number
    errorCount: number
  }>
}

/**
 * Configuration du bus d'événements
 */
export interface EventBusConfig {
  /**
   * Traiter les événements en parallèle ou séquentiellement
   */
  parallelProcessing: boolean

  /**
   * Nombre maximum de tentatives en cas d'échec
   */
  maxRetryAttempts: number

  /**
   * Délai entre les tentatives en millisecondes
   */
  retryDelayMs: number

  /**
   * Timeout pour le traitement d'un événement en millisecondes
   */
  handlerTimeoutMs: number

  /**
   * Activer le logging détaillé
   */
  enableDetailedLogging: boolean

  /**
   * Sauvegarder les événements pour audit
   */
  enableEventStore: boolean
}

/**
 * Contexte d'exécution d'un événement
 */
export interface EventExecutionContext {
  event: DomainEvent
  handlers: EventHandler[]
  startTime: number
  correlationId: string
  retryAttempt: number
}

/**
 * Résultat de l'exécution des handlers pour un événement
 */
export interface EventExecutionResult {
  event: DomainEvent
  totalHandlers: number
  successfulHandlers: number
  failedHandlers: number
  results: EventHandlingResult[]
  totalProcessingTimeMs: number
  generatedEvents: DomainEvent[]
}
