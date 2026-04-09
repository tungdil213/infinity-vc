import { eventBus, type IEvent } from '#infrastructure/events/event_bus'
import logger from '@adonisjs/core/services/logger'

/**
 * Event type that supports both old and new event formats
 */
interface PublishableEvent extends IEvent {
  eventType?: string
}

export interface DomainEventPublisher {
  publishEvents(events: PublishableEvent[]): Promise<void>
  publishEvent(event: PublishableEvent): Promise<void>
}

export class EventBusDomainEventPublisher implements DomainEventPublisher {
  async publishEvents(events: PublishableEvent[]): Promise<void> {
    const promises = events.map((event) => this.publishEvent(event))
    await Promise.all(promises)
  }

  async publishEvent(event: PublishableEvent): Promise<void> {
    const eventType = event.eventType ?? event.type

    try {
      await eventBus.publish(event)
      logger.debug({ eventType }, 'Published domain event')
    } catch (error) {
      logger.error({ eventType, error }, 'Failed to publish domain event')
      // Don't throw - we don't want event publishing failures to break business logic
    }
  }
}

// Singleton instance
export const domainEventPublisher = new EventBusDomainEventPublisher()
