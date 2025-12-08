import type { IDomainEvent, EventMetadata } from '../core/event.js'
import type { Result } from '../core/result.js'

/**
 * Stored event - persisted representation of a domain event
 */
export interface StoredEvent<TPayload = unknown> {
  /** Unique event identifier */
  id: string
  /** Event type */
  type: string
  /** Aggregate identifier */
  aggregateId: string
  /** Aggregate type */
  aggregateType: string
  /** Aggregate version at time of event */
  aggregateVersion: number
  /** Event payload */
  payload: TPayload
  /** Event metadata */
  metadata: EventMetadata
  /** When the event was stored */
  storedAt: Date
  /** Original event timestamp */
  occurredAt: Date
}

/**
 * Event stream - a sequence of events for an aggregate
 */
export interface EventStream<TPayload = unknown> {
  /** Aggregate identifier */
  aggregateId: string
  /** Aggregate type */
  aggregateType: string
  /** Current version (number of events) */
  version: number
  /** Events in the stream */
  events: StoredEvent<TPayload>[]
}

/**
 * Append result
 */
export interface AppendResult {
  /** New version after append */
  version: number
  /** Position in the global stream */
  position: number
}

/**
 * Read options for querying events
 */
export interface ReadOptions {
  /** Start from version (inclusive) */
  fromVersion?: number
  /** End at version (inclusive) */
  toVersion?: number
  /** Maximum number of events to return */
  limit?: number
  /** Read in reverse order */
  reverse?: boolean
}

/**
 * Snapshot for aggregate state
 */
export interface Snapshot<TState = unknown> {
  /** Aggregate identifier */
  aggregateId: string
  /** Aggregate type */
  aggregateType: string
  /** Version at which snapshot was taken */
  version: number
  /** Aggregate state */
  state: TState
  /** When the snapshot was created */
  createdAt: Date
}

/**
 * Event store interface - persistence for event sourcing
 */
export interface IEventStore {
  /**
   * Append events to an aggregate stream
   * @param aggregateId Aggregate identifier
   * @param aggregateType Aggregate type
   * @param events Events to append
   * @param expectedVersion Expected current version (for optimistic concurrency)
   */
  append(
    aggregateId: string,
    aggregateType: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<Result<AppendResult, Error>>

  /**
   * Read events from an aggregate stream
   */
  readStream(
    aggregateId: string,
    aggregateType: string,
    options?: ReadOptions
  ): Promise<Result<EventStream, Error>>

  /**
   * Read all events of a specific type
   */
  readByType(eventType: string, options?: ReadOptions): Promise<Result<StoredEvent[], Error>>

  /**
   * Check if a stream exists
   */
  streamExists(aggregateId: string, aggregateType: string): Promise<boolean>

  /**
   * Get the current version of a stream
   */
  getStreamVersion(aggregateId: string, aggregateType: string): Promise<number>

  /**
   * Subscribe to new events (for projections/read models)
   */
  subscribe(
    callback: (event: StoredEvent) => Promise<void>,
    fromPosition?: number
  ): () => void
}

/**
 * Snapshot store interface
 */
export interface ISnapshotStore {
  /**
   * Save a snapshot
   */
  save<TState>(snapshot: Snapshot<TState>): Promise<Result<void, Error>>

  /**
   * Load the latest snapshot for an aggregate
   */
  load<TState>(aggregateId: string, aggregateType: string): Promise<Result<Snapshot<TState> | null, Error>>

  /**
   * Delete snapshots older than a version
   */
  deleteOlderThan(aggregateId: string, aggregateType: string, version: number): Promise<void>
}

/**
 * In-memory event store implementation (for testing/development)
 */
export class InMemoryEventStore implements IEventStore {
  private streams: Map<string, StoredEvent[]> = new Map()
  private globalStream: StoredEvent[] = []
  private subscribers: Set<(event: StoredEvent) => Promise<void>> = new Set()

  private getStreamKey(aggregateId: string, aggregateType: string): string {
    return `${aggregateType}:${aggregateId}`
  }

  async append(
    aggregateId: string,
    aggregateType: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<Result<AppendResult, Error>> {
    const key = this.getStreamKey(aggregateId, aggregateType)
    const stream = this.streams.get(key) ?? []

    // Check optimistic concurrency
    if (expectedVersion !== undefined && stream.length !== expectedVersion) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error(
          `Concurrency conflict: expected version ${expectedVersion}, but stream is at version ${stream.length}`
        ),
      } as Result<AppendResult, Error>
    }

    let version = stream.length

    for (const event of events) {
      version++
      const storedEvent: StoredEvent = {
        id: event.id,
        type: event.type,
        aggregateId,
        aggregateType,
        aggregateVersion: version,
        payload: event.payload,
        metadata: event.metadata ?? {},
        storedAt: new Date(),
        occurredAt: event.timestamp,
      }

      stream.push(storedEvent)
      this.globalStream.push(storedEvent)

      // Notify subscribers
      for (const subscriber of this.subscribers) {
        await subscriber(storedEvent)
      }
    }

    this.streams.set(key, stream)

    return {
      isSuccess: true,
      isFailure: false,
      value: {
        version,
        position: this.globalStream.length,
      },
    } as Result<AppendResult, Error>
  }

  async readStream(
    aggregateId: string,
    aggregateType: string,
    options?: ReadOptions
  ): Promise<Result<EventStream, Error>> {
    const key = this.getStreamKey(aggregateId, aggregateType)
    let events = this.streams.get(key) ?? []

    // Apply filters
    if (options?.fromVersion !== undefined) {
      events = events.filter((e) => e.aggregateVersion >= options.fromVersion!)
    }
    if (options?.toVersion !== undefined) {
      events = events.filter((e) => e.aggregateVersion <= options.toVersion!)
    }
    if (options?.reverse) {
      events = [...events].reverse()
    }
    if (options?.limit !== undefined) {
      events = events.slice(0, options.limit)
    }

    return {
      isSuccess: true,
      isFailure: false,
      value: {
        aggregateId,
        aggregateType,
        version: this.streams.get(key)?.length ?? 0,
        events,
      },
    } as Result<EventStream, Error>
  }

  async readByType(eventType: string, options?: ReadOptions): Promise<Result<StoredEvent[], Error>> {
    let events = this.globalStream.filter((e) => e.type === eventType)

    if (options?.reverse) {
      events = [...events].reverse()
    }
    if (options?.limit !== undefined) {
      events = events.slice(0, options.limit)
    }

    return {
      isSuccess: true,
      isFailure: false,
      value: events,
    } as Result<StoredEvent[], Error>
  }

  async streamExists(aggregateId: string, aggregateType: string): Promise<boolean> {
    const key = this.getStreamKey(aggregateId, aggregateType)
    return this.streams.has(key)
  }

  async getStreamVersion(aggregateId: string, aggregateType: string): Promise<number> {
    const key = this.getStreamKey(aggregateId, aggregateType)
    return this.streams.get(key)?.length ?? 0
  }

  subscribe(
    callback: (event: StoredEvent) => Promise<void>,
    fromPosition?: number
  ): () => void {
    this.subscribers.add(callback)

    // Replay events from position if specified
    if (fromPosition !== undefined) {
      const eventsToReplay = this.globalStream.slice(fromPosition)
      Promise.all(eventsToReplay.map(callback)).catch(console.error)
    }

    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Test utilities
  clear(): void {
    this.streams.clear()
    this.globalStream = []
    this.subscribers.clear()
  }
}

/**
 * In-memory snapshot store implementation
 */
export class InMemorySnapshotStore implements ISnapshotStore {
  private snapshots: Map<string, Snapshot[]> = new Map()

  private getKey(aggregateId: string, aggregateType: string): string {
    return `${aggregateType}:${aggregateId}`
  }

  async save<TState>(snapshot: Snapshot<TState>): Promise<Result<void, Error>> {
    const key = this.getKey(snapshot.aggregateId, snapshot.aggregateType)
    const existing = this.snapshots.get(key) ?? []
    existing.push(snapshot as Snapshot)
    this.snapshots.set(key, existing)

    return {
      isSuccess: true,
      isFailure: false,
      value: undefined,
    } as Result<void, Error>
  }

  async load<TState>(
    aggregateId: string,
    aggregateType: string
  ): Promise<Result<Snapshot<TState> | null, Error>> {
    const key = this.getKey(aggregateId, aggregateType)
    const snapshots = this.snapshots.get(key)

    if (!snapshots || snapshots.length === 0) {
      return {
        isSuccess: true,
        isFailure: false,
        value: null,
      } as Result<Snapshot<TState> | null, Error>
    }

    // Return the latest snapshot
    return {
      isSuccess: true,
      isFailure: false,
      value: snapshots[snapshots.length - 1] as Snapshot<TState>,
    } as Result<Snapshot<TState> | null, Error>
  }

  async deleteOlderThan(aggregateId: string, aggregateType: string, version: number): Promise<void> {
    const key = this.getKey(aggregateId, aggregateType)
    const snapshots = this.snapshots.get(key)

    if (snapshots) {
      this.snapshots.set(
        key,
        snapshots.filter((s) => s.version >= version)
      )
    }
  }

  clear(): void {
    this.snapshots.clear()
  }
}

/**
 * Create a new in-memory event store
 */
export function createEventStore(): IEventStore {
  return new InMemoryEventStore()
}

/**
 * Create a new in-memory snapshot store
 */
export function createSnapshotStore(): ISnapshotStore {
  return new InMemorySnapshotStore()
}
