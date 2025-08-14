import { DomainEvent } from '../../domain/events/domain_event.js'

export type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>

export interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>
  subscribe<T>(eventType: string, handler: EventHandler<T>): void
  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void
  clear(): void
}

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const eventType = event.eventType
    const handlers = this.handlers.get(eventType)

    if (!handlers || handlers.size === 0) {
      return
    }

    // Execute all handlers in parallel
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event)
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error)
        // Don't throw - we don't want one handler failure to break others
      }
    })

    await Promise.all(promises)
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)
  }

  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }

  clear(): void {
    this.handlers.clear()
  }

  // Utility methods for debugging
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size || 0
  }

  getAllEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }
}

// Singleton instance
export const eventBus = new InMemoryEventBus()
