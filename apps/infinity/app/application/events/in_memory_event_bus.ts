import { inject } from '@adonisjs/core'
import {
  EventBus,
  EventBusConfig,
  EventBusStats,
  EventExecutionContext,
  EventExecutionResult,
  UnsubscribeFunction,
} from './event_bus.js'
import {
  DomainEvent,
  EventHandlingResult,
  DomainEventFactory,
} from '../../domain/events/base/domain_event.js'
import { EventHandler } from '../../domain/events/base/event_handler.js'
import { Result } from '../../domain/shared/result.js'
import { createContextLogger } from '#infrastructure/logging/logger'

/**
 * Implémentation en mémoire du Event Bus
 * Gère la distribution et l'exécution des événements avec retry, timeout et logging
 */
@inject()
export class InMemoryEventBus implements EventBus {
  private logger = createContextLogger('EventBus')
  private subscriptions = new Map<string, Set<EventHandler>>()
  private stats: EventBusStats
  private config: EventBusConfig

  constructor(config?: Partial<EventBusConfig>) {
    this.config = {
      parallelProcessing: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      handlerTimeoutMs: 10000, // Respect des règles Infinity (10s max)
      enableDetailedLogging: true,
      enableEventStore: true,
      ...config,
    }

    this.stats = {
      totalSubscriptions: 0,
      eventTypesCount: 0,
      eventsProcessed: 0,
      eventsPublished: 0,
      errorCount: 0,
      averageProcessingTimeMs: 0,
      handlerStats: [],
    }

    if (this.config.enableDetailedLogging) {
      this.logger.info({ config: this.config }, 'Initialized')
    }
  }

  async publish<T extends DomainEvent>(event: T): Promise<Result<void>> {
    try {
      this.stats.eventsPublished++

      if (this.config.enableDetailedLogging) {
        this.logger.debug(
          {
            eventType: event.type,
            eventId: event.eventId,
            correlationId: event.metadata.correlationId,
          },
          'Publishing event'
        )
      }

      const handlers = this.getHandlersForEvent(event)
      if (handlers.length === 0) {
        if (this.config.enableDetailedLogging) {
          this.logger.warn({ eventType: event.type }, 'No handlers found')
        }
        return Result.ok()
      }

      // Exécution asynchrone sans attendre les résultats
      this.executeHandlers(event, handlers).catch((error) => {
        this.logger.error({ error, eventType: event.type }, 'Error processing event')
        this.stats.errorCount++
      })

      return Result.ok()
    } catch (error) {
      this.logger.error({ error }, 'Failed to publish event')
      this.stats.errorCount++
      return Result.fail(error instanceof Error ? error.message : 'Unknown error during publish')
    }
  }

  async publishAndWait<T extends DomainEvent>(event: T): Promise<Result<EventHandlingResult[]>> {
    try {
      this.stats.eventsPublished++

      if (this.config.enableDetailedLogging) {
        this.logger.debug(
          { eventType: event.type, eventId: event.eventId },
          'Publishing and waiting for event'
        )
      }

      const handlers = this.getHandlersForEvent(event)
      if (handlers.length === 0) {
        return Result.ok([])
      }

      const executionResult = await this.executeHandlers(event, handlers)
      return Result.ok(executionResult.results)
    } catch (error) {
      this.logger.error({ error }, 'Failed to publish and wait for event')
      this.stats.errorCount++
      return Result.fail(
        error instanceof Error ? error.message : 'Unknown error during publishAndWait'
      )
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): UnsubscribeFunction {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set())
      this.stats.eventTypesCount++
    }

    const handlersSet = this.subscriptions.get(eventType)!
    handlersSet.add(handler as EventHandler)
    this.stats.totalSubscriptions++

    if (this.config.enableDetailedLogging) {
      this.logger.debug({ handlerName: handler.name, eventType }, 'Handler subscribed')
    }

    // Retourner la fonction de désabonnement
    return () => {
      handlersSet.delete(handler as EventHandler)
      this.stats.totalSubscriptions--

      if (handlersSet.size === 0) {
        this.subscriptions.delete(eventType)
        this.stats.eventTypesCount--
      }

      if (this.config.enableDetailedLogging) {
        this.logger.debug({ handlerName: handler.name, eventType }, 'Handler unsubscribed')
      }
    }
  }

  subscribeToMultiple<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>
  ): UnsubscribeFunction {
    const unsubscribeFunctions = eventTypes.map((eventType) => this.subscribe(eventType, handler))

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
    }
  }

  unsubscribeAll(eventType: string): void {
    if (this.subscriptions.has(eventType)) {
      const handlersCount = this.subscriptions.get(eventType)!.size
      this.subscriptions.delete(eventType)
      this.stats.totalSubscriptions -= handlersCount
      this.stats.eventTypesCount--

      if (this.config.enableDetailedLogging) {
        this.logger.info({ eventType }, 'All handlers unsubscribed')
      }
    }
  }

  getStats(): EventBusStats {
    return { ...this.stats }
  }

  clear(): void {
    this.subscriptions.clear()
    this.stats = {
      totalSubscriptions: 0,
      eventTypesCount: 0,
      eventsProcessed: 0,
      eventsPublished: 0,
      errorCount: 0,
      averageProcessingTimeMs: 0,
      handlerStats: [],
    }

    if (this.config.enableDetailedLogging) {
      console.log('🧹 EventBus: Cleared all subscriptions and stats')
    }
  }

  private getHandlersForEvent(event: DomainEvent): EventHandler[] {
    const handlers = this.subscriptions.get(event.type) || new Set()

    return Array.from(handlers)
      .filter((handler) => handler.canHandle(event))
      .sort((a, b) => a.priority - b.priority) // Trier par priorité (0 = plus haute)
  }

  private async executeHandlers(
    event: DomainEvent,
    handlers: EventHandler[]
  ): Promise<EventExecutionResult> {
    const startTime = performance.now()
    const results: EventHandlingResult[] = []
    const generatedEvents: DomainEvent[] = []

    const context: EventExecutionContext = {
      event,
      handlers,
      startTime,
      correlationId: event.metadata.correlationId,
      retryAttempt: 0,
    }

    if (this.config.parallelProcessing) {
      // Exécution en parallèle
      const promises = handlers.map((handler) => this.executeHandler(handler, event, context))
      const handlerResults = await Promise.allSettled(promises)

      handlerResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.isSuccess) {
          results.push(result.value.value)
          if (result.value.value.generatedEvents) {
            generatedEvents.push(...result.value.value.generatedEvents)
          }
        } else {
          this.stats.errorCount++
          console.error(`❌ EventBus: Handler ${handlers[index].name} failed`)
        }
      })
    } else {
      // Exécution séquentielle
      for (const handler of handlers) {
        try {
          const result = await this.executeHandler(handler, event, context)
          if (result.isSuccess) {
            results.push(result.value)
            if (result.value.generatedEvents) {
              generatedEvents.push(...result.value.generatedEvents)
            }
          } else {
            this.stats.errorCount++
          }
        } catch (error) {
          console.error(`❌ EventBus: Handler ${handler.name} failed:`, error)
          this.stats.errorCount++
        }
      }
    }

    // Traiter les événements générés
    for (const generatedEvent of generatedEvents) {
      await this.publish(generatedEvent)
    }

    const totalProcessingTimeMs = performance.now() - startTime
    this.updateStats(results, totalProcessingTimeMs)

    return {
      event,
      totalHandlers: handlers.length,
      successfulHandlers: results.filter((r) => r.success).length,
      failedHandlers: results.filter((r) => !r.success).length,
      results,
      totalProcessingTimeMs,
      generatedEvents,
    }
  }

  private async executeHandler(
    handler: EventHandler,
    event: DomainEvent,
    context: EventExecutionContext
  ): Promise<Result<EventHandlingResult>> {
    const timeout = new Promise<Result<EventHandlingResult>>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(`Handler ${handler.name} timed out after ${this.config.handlerTimeoutMs}ms`)
          ),
        this.config.handlerTimeoutMs
      )
    })

    const execution = (async (): Promise<Result<EventHandlingResult>> => {
      try {
        const result = await handler.handle(event)

        if (result.isSuccess) {
          await handler.onSuccess?.(event, result.value)
        } else {
          await handler.onError?.(event, new Error(result.error))
        }

        return result
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown handler error')
        await handler.onError?.(event, err)
        return Result.fail(err.message)
      }
    })()

    return Promise.race([execution, timeout])
  }

  private updateStats(results: EventHandlingResult[], totalProcessingTimeMs: number): void {
    this.stats.eventsProcessed++

    // Mettre à jour la moyenne des temps de traitement
    const currentAvg = this.stats.averageProcessingTimeMs
    const newCount = this.stats.eventsProcessed
    this.stats.averageProcessingTimeMs =
      (currentAvg * (newCount - 1) + totalProcessingTimeMs) / newCount

    // Mettre à jour les stats par handler
    results.forEach((result) => {
      let handlerStat = this.stats.handlerStats.find((s) => s.handlerName === result.handlerName)

      if (!handlerStat) {
        handlerStat = {
          handlerName: result.handlerName,
          eventsProcessed: 0,
          averageProcessingTimeMs: 0,
          errorCount: 0,
        }
        this.stats.handlerStats.push(handlerStat)
      }

      handlerStat.eventsProcessed++
      if (!result.success) {
        handlerStat.errorCount++
      }

      // Calculer la nouvelle moyenne
      const prevAvg = handlerStat.averageProcessingTimeMs
      const count = handlerStat.eventsProcessed
      handlerStat.averageProcessingTimeMs =
        (prevAvg * (count - 1) + result.processingTimeMs) / count
    })
  }
}
