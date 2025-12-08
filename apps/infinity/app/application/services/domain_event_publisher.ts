import { eventBus, type IEvent } from '../../infrastructure/events/event_bus.js'

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
    try {
      await eventBus.publish(event)
      const eventType = event.eventType ?? event.type
      console.log(`Published domain event: ${eventType}`)
    } catch (error) {
      const eventType = event.eventType ?? event.type
      console.error(`Failed to publish domain event ${eventType}:`, error)
      // Don't throw - we don't want event publishing failures to break business logic
    }
  }
}

// Singleton instance
export const domainEventPublisher = new EventBusDomainEventPublisher()
