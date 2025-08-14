import { eventBus } from '../../infrastructure/events/event_bus.js'
import { DomainEvent } from '../../domain/events/domain_event.js'

export interface DomainEventPublisher {
  publishEvents(events: DomainEvent[]): Promise<void>
  publishEvent(event: DomainEvent): Promise<void>
}

export class EventBusDomainEventPublisher implements DomainEventPublisher {
  async publishEvents(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publishEvent(event))
    await Promise.all(promises)
  }

  async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await eventBus.publish(event)
      console.log(`Published domain event: ${event.eventType}`)
    } catch (error) {
      console.error(`Failed to publish domain event ${event.eventType}:`, error)
      // Don't throw - we don't want event publishing failures to break business logic
    }
  }
}

// Singleton instance
export const domainEventPublisher = new EventBusDomainEventPublisher()
