/**
 * Event Bus - Re-exports from @tyfo.dev/events for backward compatibility
 * This file bridges the new package with existing code
 */
import {
  type IEvent,
  type IEventBus,
  type SubscriberCallback,
  createEventBus,
} from '@tyfo.dev/events'

// Re-export types for backward compatibility
export type EventHandler<T = unknown> = SubscriberCallback<IEvent<T>>

export interface EventBus {
  publish<T>(event: IEvent<T>): Promise<void>
  subscribe<T>(eventType: string, handler: EventHandler<T>): void
  unsubscribe(eventType: string): void
  clear(): void
}

/**
 * Adapter to bridge old EventBus interface with new IEventBus
 */
class EventBusAdapter implements EventBus {
  private bus: IEventBus
  private subscriptions: Map<string, { unsubscribe: () => void }> = new Map()

  constructor() {
    this.bus = createEventBus()
  }

  async publish<T>(event: IEvent<T>): Promise<void> {
    await this.bus.publish(event)
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const subscription = this.bus.subscribe(eventType, handler as SubscriberCallback<IEvent>)
    this.subscriptions.set(`${eventType}:${handler.toString()}`, subscription)
  }

  unsubscribe(eventType: string): void {
    // Unsubscribe all handlers for this event type
    for (const [key, subscription] of this.subscriptions) {
      if (key.startsWith(`${eventType}:`)) {
        subscription.unsubscribe()
        this.subscriptions.delete(key)
      }
    }
  }

  clear(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe()
    }
    this.subscriptions.clear()
    this.bus.clear()
  }

  // Utility methods for debugging
  getHandlerCount(eventType: string): number {
    return this.bus.subscriberCount(eventType)
  }

  getAllEventTypes(): string[] {
    return this.bus.getStats().subscribersByType
      ? Object.keys(this.bus.getStats().subscribersByType)
      : []
  }

  // Access the underlying bus for advanced usage
  getUnderlyingBus(): IEventBus {
    return this.bus
  }
}

// Singleton instance
export const eventBus = new EventBusAdapter()

// Re-export the underlying bus for direct access if needed
export { createEventBus, type IEventBus, type IEvent }
