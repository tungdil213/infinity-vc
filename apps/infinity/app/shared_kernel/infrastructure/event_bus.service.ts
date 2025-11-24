import type { EventBus, EventHandler } from '../application/event_bus.interface.js'
import type { DomainEvent } from '../domain/events/domain_event.js'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('EventBus')

/**
 * Event Bus Service
 * Implémentation en mémoire de l'event bus
 */
export class EventBusService implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName)
    if (!handlers || handlers.size === 0) {
      logger.debug({ eventName: event.eventName }, 'No handlers registered for event')
      return
    }

    logger.info({ eventName: event.eventName, eventId: event.eventId }, 'Publishing event')

    const promises = Array.from(handlers).map((handler) => {
      try {
        return Promise.resolve(handler(event))
      } catch (error) {
        logger.error({ error, eventName: event.eventName }, 'Error executing event handler')
        return Promise.resolve()
      }
    })

    await Promise.all(promises)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)))
  }

  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set())
    }
    this.handlers.get(eventName)!.add(handler)
    logger.debug({ eventName }, 'Event handler registered')
  }

  unsubscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName)
    if (handlers) {
      handlers.delete(handler)
      logger.debug({ eventName }, 'Event handler unregistered')
    }
  }
}
