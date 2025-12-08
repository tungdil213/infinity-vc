import type { IEvent } from './event.js'
import type { Result } from './result.js'

/**
 * Event handler interface - processes a single event type
 */
export interface IEventHandler<TEvent extends IEvent = IEvent, TResult = void> {
  /** The event type this handler processes */
  readonly eventType: string

  /**
   * Handle the event
   * @param event The event to process
   * @returns Result of the operation
   */
  handle(event: TEvent): Promise<Result<TResult, Error>>
}

/**
 * Multi-event handler - can handle multiple event types
 */
export interface IMultiEventHandler<TResult = void> {
  /** Event types this handler can process */
  readonly eventTypes: string[]

  /**
   * Check if this handler can process the given event
   */
  canHandle(event: IEvent): boolean

  /**
   * Handle the event
   */
  handle(event: IEvent): Promise<Result<TResult, Error>>
}

/**
 * Event handler registry - manages handler subscriptions
 */
export interface IEventHandlerRegistry {
  /**
   * Register a handler for an event type
   */
  register<TEvent extends IEvent>(eventType: string, handler: IEventHandler<TEvent>): void

  /**
   * Unregister a handler
   */
  unregister<TEvent extends IEvent>(eventType: string, handler: IEventHandler<TEvent>): void

  /**
   * Get all handlers for an event type
   */
  getHandlers<TEvent extends IEvent>(eventType: string): IEventHandler<TEvent>[]

  /**
   * Check if there are handlers for an event type
   */
  hasHandlers(eventType: string): boolean

  /**
   * Clear all handlers
   */
  clear(): void
}

/**
 * Abstract base class for event handlers with common functionality
 */
export abstract class EventHandler<TEvent extends IEvent, TResult = void>
  implements IEventHandler<TEvent, TResult>
{
  abstract readonly eventType: string
  abstract handle(event: TEvent): Promise<Result<TResult, Error>>

  /**
   * Validate the event before processing
   */
  protected validate(_event: TEvent): Result<void, Error> {
    return { isSuccess: true, isFailure: false, value: undefined } as Result<void, Error>
  }
}

/**
 * Decorator pattern for event handlers (e.g., logging, retry, circuit breaker)
 */
export abstract class EventHandlerDecorator<TEvent extends IEvent, TResult = void>
  implements IEventHandler<TEvent, TResult>
{
  constructor(protected readonly inner: IEventHandler<TEvent, TResult>) {}

  get eventType(): string {
    return this.inner.eventType
  }

  abstract handle(event: TEvent): Promise<Result<TResult, Error>>
}

/**
 * Retry decorator for event handlers
 */
export class RetryEventHandler<TEvent extends IEvent, TResult = void> extends EventHandlerDecorator<
  TEvent,
  TResult
> {
  constructor(
    inner: IEventHandler<TEvent, TResult>,
    private readonly maxRetries: number = 3,
    private readonly delayMs: number = 1000
  ) {
    super(inner)
  }

  async handle(event: TEvent): Promise<Result<TResult, Error>> {
    let lastError: Error | undefined
    let attempt = 0

    while (attempt <= this.maxRetries) {
      const result = await this.inner.handle(event)

      if (result.isSuccess) {
        return result
      }

      lastError = result.error
      attempt++

      if (attempt <= this.maxRetries) {
        await this.delay(this.delayMs * attempt)
      }
    }

    return {
      isSuccess: false,
      isFailure: true,
      error: lastError ?? new Error('Max retries exceeded'),
    } as Result<TResult, Error>
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
