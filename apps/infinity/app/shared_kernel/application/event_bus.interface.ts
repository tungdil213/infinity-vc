import type { DomainEvent } from '../domain/events/domain_event.js'

/**
 * Event Bus Interface
 * Publication et souscription aux événements du domaine
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>
  publishAll(events: DomainEvent[]): Promise<void>
  subscribe(eventName: string, handler: EventHandler): void
  unsubscribe(eventName: string, handler: EventHandler): void
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void
