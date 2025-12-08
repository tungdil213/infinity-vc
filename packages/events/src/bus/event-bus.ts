import type { IEvent, EventMetadata } from '../core/event.js'
import type { IEventHandler } from '../core/handler.js'
import type { ISubscriber, SubscriberCallback, SubscriptionOptions } from '../core/subscription.js'
import { Subscription } from '../core/subscription.js'
import type { Result } from '../core/result.js'

/**
 * Event bus interface - pub/sub pattern for events
 */
export interface IEventBus {
  /**
   * Publish an event to all subscribers
   */
  publish<TEvent extends IEvent>(event: TEvent): Promise<void>

  /**
   * Publish multiple events in order
   */
  publishAll<TEvent extends IEvent>(events: TEvent[]): Promise<void>

  /**
   * Subscribe to an event type
   */
  subscribe<TEvent extends IEvent>(
    eventType: string,
    callback: SubscriberCallback<TEvent>,
    options?: SubscriptionOptions
  ): Subscription

  /**
   * Subscribe to multiple event types
   */
  subscribeMany<TEvent extends IEvent>(
    eventTypes: string[],
    callback: SubscriberCallback<TEvent>,
    options?: SubscriptionOptions
  ): Subscription

  /**
   * Register an event handler
   */
  registerHandler<TEvent extends IEvent>(handler: IEventHandler<TEvent>): void

  /**
   * Unregister an event handler
   */
  unregisterHandler<TEvent extends IEvent>(handler: IEventHandler<TEvent>): void

  /**
   * Check if there are subscribers for an event type
   */
  hasSubscribers(eventType: string): boolean

  /**
   * Get subscriber count for an event type
   */
  subscriberCount(eventType: string): number

  /**
   * Clear all subscriptions and handlers
   */
  clear(): void

  /**
   * Get bus statistics
   */
  getStats(): EventBusStats
}

/**
 * Event bus statistics
 */
export interface EventBusStats {
  totalSubscribers: number
  subscribersByType: Record<string, number>
  totalEventsPublished: number
  totalEventsDelivered: number
  failedDeliveries: number
}

/**
 * Subscriber entry for internal tracking
 */
interface SubscriberEntry<TEvent extends IEvent = IEvent> {
  subscription: Subscription
  callback: SubscriberCallback<TEvent>
  filter?: (event: IEvent) => boolean
  priority: number
}

/**
 * In-memory event bus implementation
 */
export class InMemoryEventBus implements IEventBus {
  private subscribers: Map<string, SubscriberEntry[]> = new Map()
  private handlers: Map<string, Set<IEventHandler>> = new Map()
  private stats: EventBusStats = {
    totalSubscribers: 0,
    subscribersByType: {},
    totalEventsPublished: 0,
    totalEventsDelivered: 0,
    failedDeliveries: 0,
  }

  async publish<TEvent extends IEvent>(event: TEvent): Promise<void> {
    this.stats.totalEventsPublished++

    // Get subscribers for this event type
    const subscribers = this.subscribers.get(event.type) ?? []
    
    // Sort by priority
    const sortedSubscribers = [...subscribers].sort((a, b) => a.priority - b.priority)

    // Notify subscribers
    for (const entry of sortedSubscribers) {
      if (!entry.subscription.isActive) continue
      if (entry.filter && !entry.filter(event)) continue

      try {
        await entry.callback(event as TEvent)
        entry.subscription.incrementEventCount()
        this.stats.totalEventsDelivered++
      } catch (error) {
        this.stats.failedDeliveries++
        console.error(`Event delivery failed for ${event.type}:`, error)
      }
    }

    // Execute handlers
    const handlers = this.handlers.get(event.type) ?? new Set()
    for (const handler of handlers) {
      try {
        await handler.handle(event)
        this.stats.totalEventsDelivered++
      } catch (error) {
        this.stats.failedDeliveries++
        console.error(`Handler execution failed for ${event.type}:`, error)
      }
    }
  }

  async publishAll<TEvent extends IEvent>(events: TEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }

  subscribe<TEvent extends IEvent>(
    eventType: string,
    callback: SubscriberCallback<TEvent>,
    options?: SubscriptionOptions
  ): Subscription {
    return this.subscribeMany([eventType], callback, options)
  }

  subscribeMany<TEvent extends IEvent>(
    eventTypes: string[],
    callback: SubscriberCallback<TEvent>,
    options?: SubscriptionOptions
  ): Subscription {
    const subscription = new Subscription(eventTypes, () => {
      this.removeSubscription(subscription.id, eventTypes)
    }, options)

    const entry: SubscriberEntry<TEvent> = {
      subscription,
      callback,
      filter: options?.filter,
      priority: options?.priority ?? 100,
    }

    for (const eventType of eventTypes) {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, [])
      }
      this.subscribers.get(eventType)!.push(entry as SubscriberEntry)
      this.stats.subscribersByType[eventType] = 
        (this.stats.subscribersByType[eventType] ?? 0) + 1
    }

    this.stats.totalSubscribers++
    return subscription
  }

  private removeSubscription(subscriptionId: string, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      const subscribers = this.subscribers.get(eventType)
      if (subscribers) {
        const index = subscribers.findIndex((s) => s.subscription.id === subscriptionId)
        if (index !== -1) {
          subscribers.splice(index, 1)
          this.stats.subscribersByType[eventType]--
          if (this.stats.subscribersByType[eventType] === 0) {
            delete this.stats.subscribersByType[eventType]
          }
        }
      }
    }
    this.stats.totalSubscribers--
  }

  registerHandler<TEvent extends IEvent>(handler: IEventHandler<TEvent>): void {
    if (!this.handlers.has(handler.eventType)) {
      this.handlers.set(handler.eventType, new Set())
    }
    this.handlers.get(handler.eventType)!.add(handler)
  }

  unregisterHandler<TEvent extends IEvent>(handler: IEventHandler<TEvent>): void {
    const handlers = this.handlers.get(handler.eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  hasSubscribers(eventType: string): boolean {
    return this.subscriberCount(eventType) > 0
  }

  subscriberCount(eventType: string): number {
    const subscribers = this.subscribers.get(eventType)?.filter((s) => s.subscription.isActive) ?? []
    const handlers = this.handlers.get(eventType)?.size ?? 0
    return subscribers.length + handlers
  }

  clear(): void {
    // Unsubscribe all active subscriptions
    for (const subscribers of this.subscribers.values()) {
      for (const entry of subscribers) {
        entry.subscription.unsubscribe()
      }
    }

    this.subscribers.clear()
    this.handlers.clear()
    this.stats = {
      totalSubscribers: 0,
      subscribersByType: {},
      totalEventsPublished: 0,
      totalEventsDelivered: 0,
      failedDeliveries: 0,
    }
  }

  getStats(): EventBusStats {
    return { ...this.stats }
  }
}

/**
 * Typed event bus - provides type-safe event publishing
 */
export class TypedEventBus<TEventMap extends Record<string, IEvent>> {
  constructor(private readonly bus: IEventBus) {}

  async publish<K extends keyof TEventMap>(event: TEventMap[K]): Promise<void> {
    await this.bus.publish(event)
  }

  subscribe<K extends keyof TEventMap & string>(
    eventType: K,
    callback: SubscriberCallback<TEventMap[K]>,
    options?: SubscriptionOptions
  ): Subscription {
    return this.bus.subscribe(eventType, callback as SubscriberCallback<IEvent>, options)
  }

  clear(): void {
    this.bus.clear()
  }
}

/**
 * Create a new event bus instance
 */
export function createEventBus(): IEventBus {
  return new InMemoryEventBus()
}
