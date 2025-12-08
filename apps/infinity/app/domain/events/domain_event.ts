/**
 * Domain Event - Re-exports from @tyfo.dev/events for backward compatibility
 */
import { type IEvent } from '@tyfo.dev/events'

// Backward compatible alias
export interface DomainEvent<T = unknown> {
  readonly eventType: string
  readonly timestamp: Date
  readonly data?: T
}

/**
 * Adapter interface that bridges old DomainEvent with new IEvent
 */
export interface BridgedEvent<T = unknown> extends IEvent<T> {
  readonly eventType: string
}

export abstract class BaseDomainEvent<T = unknown> implements DomainEvent<T>, BridgedEvent<T> {
  abstract readonly eventType: string
  readonly timestamp: Date
  readonly data?: T

  // IEvent compatibility
  readonly id: string
  abstract get type(): string
  abstract get payload(): T

  constructor(timestamp?: Date) {
    this.id = crypto.randomUUID()
    this.timestamp = timestamp ?? new Date()
  }
}

// Re-export for use elsewhere
export { type IEvent }
