import type { IEvent } from './event.js'

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Unique subscription identifier */
  id?: string
  /** Filter events by predicate */
  filter?: (event: IEvent) => boolean
  /** Priority for ordering handlers (lower = higher priority) */
  priority?: number
  /** Maximum number of events to receive before auto-unsubscribe */
  maxEvents?: number
  /** Timeout in ms after which subscription expires */
  timeoutMs?: number
}

/**
 * Subscription - represents an active event subscription
 */
export interface ISubscription {
  /** Unique subscription identifier */
  readonly id: string
  /** Event type(s) this subscription listens to */
  readonly eventTypes: string[]
  /** Whether the subscription is active */
  readonly isActive: boolean
  /** Number of events received */
  readonly eventCount: number
  /** When the subscription was created */
  readonly createdAt: Date

  /**
   * Pause the subscription temporarily
   */
  pause(): void

  /**
   * Resume a paused subscription
   */
  resume(): void

  /**
   * Unsubscribe and clean up resources
   */
  unsubscribe(): void
}

/**
 * Subscriber callback type
 */
export type SubscriberCallback<TEvent extends IEvent = IEvent> = (event: TEvent) => void | Promise<void>

/**
 * Subscriber interface - receives events
 */
export interface ISubscriber<TEvent extends IEvent = IEvent> {
  /** Callback when event is received */
  onEvent: SubscriberCallback<TEvent>
  /** Optional error handler */
  onError?: (error: Error, event?: TEvent) => void
  /** Optional completion handler */
  onComplete?: () => void
}

/**
 * Subscription implementation
 */
export class Subscription implements ISubscription {
  readonly id: string
  readonly eventTypes: string[]
  readonly createdAt: Date
  
  private _isActive: boolean = true
  private _isPaused: boolean = false
  private _eventCount: number = 0
  private _unsubscribeCallback?: () => void
  private _timeoutId?: ReturnType<typeof setTimeout>
  private readonly _maxEvents?: number

  constructor(
    eventTypes: string[],
    unsubscribeCallback: () => void,
    options?: SubscriptionOptions
  ) {
    this.id = options?.id ?? crypto.randomUUID()
    this.eventTypes = eventTypes
    this.createdAt = new Date()
    this._unsubscribeCallback = unsubscribeCallback
    this._maxEvents = options?.maxEvents

    if (options?.timeoutMs) {
      this._timeoutId = setTimeout(() => this.unsubscribe(), options.timeoutMs)
    }
  }

  get isActive(): boolean {
    return this._isActive && !this._isPaused
  }

  get eventCount(): number {
    return this._eventCount
  }

  incrementEventCount(): boolean {
    this._eventCount++
    
    if (this._maxEvents && this._eventCount >= this._maxEvents) {
      this.unsubscribe()
      return false
    }
    
    return true
  }

  pause(): void {
    this._isPaused = true
  }

  resume(): void {
    this._isPaused = false
  }

  unsubscribe(): void {
    if (!this._isActive) return

    this._isActive = false
    
    if (this._timeoutId) {
      clearTimeout(this._timeoutId)
    }
    
    this._unsubscribeCallback?.()
    this._unsubscribeCallback = undefined
  }
}

/**
 * Subscription manager - tracks active subscriptions
 */
export interface ISubscriptionManager {
  /**
   * Get a subscription by ID
   */
  get(id: string): ISubscription | undefined

  /**
   * Get all active subscriptions for an event type
   */
  getByEventType(eventType: string): ISubscription[]

  /**
   * Get all active subscriptions
   */
  getAll(): ISubscription[]

  /**
   * Get subscription statistics
   */
  getStats(): SubscriptionStats
}

/**
 * Subscription statistics
 */
export interface SubscriptionStats {
  /** Total active subscriptions */
  total: number
  /** Subscriptions by event type */
  byEventType: Record<string, number>
  /** Total events delivered */
  totalEventsDelivered: number
}
