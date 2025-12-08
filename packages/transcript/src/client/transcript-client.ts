import type {
  ITranscriptMessage,
  ITranscriptSubscription,
  ConnectionOptions,
  ConnectionState,
  ConnectionStats,
  MessageHandler,
  ErrorHandler,
  StateChangeHandler,
  SubscriptionOptions,
} from '../core/types.js'

/**
 * Client-side transcript service interface
 */
export interface ITranscriptClient {
  /**
   * Current connection state
   */
  readonly state: ConnectionState

  /**
   * Whether client is connected
   */
  readonly isConnected: boolean

  /**
   * Connect to the transcript server
   */
  connect(): Promise<void>

  /**
   * Disconnect from the server
   */
  disconnect(): void

  /**
   * Subscribe to a channel
   */
  subscribe<TPayload = unknown>(
    channel: string,
    handler: MessageHandler<TPayload>,
    options?: SubscriptionOptions
  ): ITranscriptSubscription

  /**
   * Subscribe to multiple channels
   */
  subscribeMany<TPayload = unknown>(
    channels: string[],
    handler: MessageHandler<TPayload>,
    options?: SubscriptionOptions
  ): ITranscriptSubscription[]

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscriptionId: string): void

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void

  /**
   * Register state change handler
   */
  onStateChange(handler: StateChangeHandler): () => void

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats
}

/**
 * Subscription implementation
 */
class TranscriptSubscription implements ITranscriptSubscription {
  private _isActive: boolean = true

  constructor(
    public readonly id: string,
    public readonly channel: string,
    private readonly unsubscribeCallback: () => void
  ) {}

  get isActive(): boolean {
    return this._isActive
  }

  unsubscribe(): void {
    if (!this._isActive) return
    this._isActive = false
    this.unsubscribeCallback()
  }
}

/**
 * SSE-based transcript client
 */
export class SSETranscriptClient implements ITranscriptClient {
  private eventSource: EventSource | null = null
  private _state: ConnectionState = 'disconnected'
  private subscriptions: Map<string, Set<{ id: string; handler: MessageHandler }>> = new Map()
  private errorHandlers: Set<ErrorHandler> = new Set()
  private stateHandlers: Set<StateChangeHandler> = new Set()
  private reconnectAttempts: number = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private stats: ConnectionStats = {
    state: 'disconnected',
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    activeSubscriptions: 0,
  }

  constructor(private readonly options: ConnectionOptions) {}

  get state(): ConnectionState {
    return this._state
  }

  get isConnected(): boolean {
    return this._state === 'connected'
  }

  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return
    }

    this.setState('connecting')

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.options.url)
        if (this.options.token) {
          url.searchParams.set('token', this.options.token)
        }

        this.eventSource = new EventSource(url.toString(), {
          withCredentials: true,
        })

        this.eventSource.onopen = () => {
          this.setState('connected')
          this.stats.connectedAt = new Date()
          this.reconnectAttempts = 0
          resolve()
        }

        this.eventSource.onerror = (error) => {
          if (this._state === 'connecting') {
            reject(new Error('Failed to connect'))
          } else {
            this.handleError(new Error('SSE connection error'))
            this.handleDisconnect()
          }
        }

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event)
        }

        // Subscribe to specific event types
        this.eventSource.addEventListener('message', (event) => {
          this.handleMessage(event)
        })
      } catch (error) {
        this.setState('error')
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.setState('disconnected')
  }

  subscribe<TPayload = unknown>(
    channel: string,
    handler: MessageHandler<TPayload>,
    options?: SubscriptionOptions
  ): ITranscriptSubscription {
    const subscriptionId = crypto.randomUUID()

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }

    const entry = {
      id: subscriptionId,
      handler: handler as MessageHandler,
    }

    this.subscriptions.get(channel)!.add(entry)
    this.stats.activeSubscriptions++

    // If event type filtering, wrap the handler
    if (options?.eventTypes) {
      const originalHandler = handler
      const filteredHandler: MessageHandler<TPayload> = (message) => {
        if (options.eventTypes!.includes(message.type)) {
          originalHandler(message)
        }
      }
      entry.handler = filteredHandler as MessageHandler
    }

    return new TranscriptSubscription(subscriptionId, channel, () => {
      const channelSubs = this.subscriptions.get(channel)
      if (channelSubs) {
        channelSubs.delete(entry)
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel)
        }
        this.stats.activeSubscriptions--
      }
    })
  }

  subscribeMany<TPayload = unknown>(
    channels: string[],
    handler: MessageHandler<TPayload>,
    options?: SubscriptionOptions
  ): ITranscriptSubscription[] {
    return channels.map((channel) => this.subscribe(channel, handler, options))
  }

  unsubscribe(subscriptionId: string): void {
    for (const [channel, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (sub.id === subscriptionId) {
          subs.delete(sub)
          if (subs.size === 0) {
            this.subscriptions.delete(channel)
          }
          this.stats.activeSubscriptions--
          return
        }
      }
    }
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler)
    return () => this.stateHandlers.delete(handler)
  }

  getStats(): ConnectionStats {
    return {
      ...this.stats,
      state: this._state,
      reconnectAttempts: this.reconnectAttempts,
    }
  }

  private setState(newState: ConnectionState): void {
    const previousState = this._state
    this._state = newState
    this.stats.state = newState

    for (const handler of this.stateHandlers) {
      handler(newState, previousState)
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ITranscriptMessage = JSON.parse(event.data)
      this.stats.messagesReceived++

      // Find matching subscriptions
      const handlers = this.subscriptions.get(message.channel)
      if (handlers) {
        for (const { handler } of handlers) {
          try {
            handler(message)
          } catch (error) {
            console.error('Handler error:', error)
          }
        }
      }

      // Also check for wildcard subscriptions
      const wildcardChannel = message.channel.split(':')[0] + ':*'
      const wildcardHandlers = this.subscriptions.get(wildcardChannel)
      if (wildcardHandlers) {
        for (const { handler } of wildcardHandlers) {
          try {
            handler(message)
          } catch (error) {
            console.error('Wildcard handler error:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }

  private handleError(error: Error): void {
    this.stats.lastError = error.message

    for (const handler of this.errorHandlers) {
      handler(error)
    }
  }

  private handleDisconnect(): void {
    this.setState('reconnecting')

    if (this.options.autoReconnect !== false) {
      this.attemptReconnect()
    } else {
      this.setState('disconnected')
    }
  }

  private attemptReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? 5
    const delay = this.options.reconnectDelay ?? 1000

    if (this.reconnectAttempts >= maxAttempts) {
      this.setState('error')
      this.handleError(new Error('Max reconnection attempts reached'))
      return
    }

    this.reconnectAttempts++
    const backoffDelay = delay * Math.pow(2, this.reconnectAttempts - 1)

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.handleError(error)
        this.attemptReconnect()
      })
    }, backoffDelay)
  }
}

/**
 * Create an SSE transcript client
 */
export function createTranscriptClient(options: ConnectionOptions): ITranscriptClient {
  return new SSETranscriptClient(options)
}
