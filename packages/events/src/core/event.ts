/**
 * Base event interface - all events must implement this
 */
export interface IEvent<TPayload = unknown> {
  /** Unique event identifier */
  readonly id: string
  /** Event type discriminator */
  readonly type: string
  /** Event payload data */
  readonly payload: TPayload
  /** Event creation timestamp */
  readonly timestamp: Date
  /** Optional metadata for tracing/debugging */
  readonly metadata?: EventMetadata
}

/**
 * Event metadata for tracing and debugging
 */
export interface EventMetadata {
  /** Correlation ID for request tracing */
  correlationId?: string
  /** Causation ID - the event that caused this one */
  causationId?: string
  /** User who triggered the event */
  userId?: string
  /** Source system/service */
  source?: string
  /** Event version for schema evolution */
  version?: number
  /** Custom metadata */
  [key: string]: unknown
}

/**
 * Domain event - represents something that happened in the domain
 */
export interface IDomainEvent<TPayload = unknown> extends IEvent<TPayload> {
  /** Aggregate root ID this event belongs to */
  readonly aggregateId: string
  /** Aggregate type (e.g., 'Lobby', 'Game') */
  readonly aggregateType: string
  /** Aggregate version after this event */
  readonly aggregateVersion: number
}

/**
 * Integration event - for cross-boundary communication
 */
export interface IIntegrationEvent<TPayload = unknown> extends IEvent<TPayload> {
  /** Target channels/topics for this event */
  readonly channels: string[]
}

/**
 * Event envelope - wraps events for transport
 */
export interface IEventEnvelope<TEvent extends IEvent = IEvent> {
  readonly event: TEvent
  readonly sentAt: Date
  readonly retryCount: number
  readonly maxRetries: number
}

/**
 * Abstract base class for domain events
 */
export abstract class DomainEvent<TPayload = unknown> implements IDomainEvent<TPayload> {
  readonly id: string
  readonly timestamp: Date
  readonly metadata?: EventMetadata

  abstract readonly type: string
  abstract readonly payload: TPayload
  abstract readonly aggregateId: string
  abstract readonly aggregateType: string
  abstract readonly aggregateVersion: number

  constructor(id?: string, metadata?: EventMetadata) {
    this.id = id ?? crypto.randomUUID()
    this.timestamp = new Date()
    this.metadata = metadata
  }
}

/**
 * Abstract base class for integration events
 */
export abstract class IntegrationEvent<TPayload = unknown> implements IIntegrationEvent<TPayload> {
  readonly id: string
  readonly timestamp: Date
  readonly metadata?: EventMetadata

  abstract readonly type: string
  abstract readonly payload: TPayload
  abstract readonly channels: string[]

  constructor(id?: string, metadata?: EventMetadata) {
    this.id = id ?? crypto.randomUUID()
    this.timestamp = new Date()
    this.metadata = metadata
  }
}
