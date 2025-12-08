import type { IEvent } from '@tyfo.dev/events'

/**
 * Transport type - underlying protocol
 */
export type TransportType = 'sse' | 'websocket' | 'polling'

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

/**
 * Transcript message - wraps events for transport
 */
export interface ITranscriptMessage<TPayload = unknown> {
  /** Unique message ID */
  readonly id: string
  /** Channel the message belongs to */
  readonly channel: string
  /** Event type */
  readonly type: string
  /** Message payload */
  readonly payload: TPayload
  /** Server timestamp */
  readonly timestamp: Date
  /** Optional metadata */
  readonly metadata?: Record<string, unknown>
}

/**
 * Channel definition
 */
export interface IChannel {
  /** Unique channel identifier */
  readonly id: string
  /** Channel pattern (e.g., 'lobby:*', 'game:123') */
  readonly pattern: string
  /** Whether authentication is required */
  readonly requiresAuth: boolean
  /** Optional authorization check */
  authorize?: (userId: string, channelId: string) => Promise<boolean>
}

/**
 * Channel patterns for common use cases
 */
export const ChannelPatterns = {
  /** Global broadcast channel */
  global: () => 'global',
  /** User-specific channel */
  user: (userId: string) => `user:${userId}`,
  /** Lobby channel */
  lobby: (lobbyId: string) => `lobby:${lobbyId}`,
  /** Game channel */
  game: (gameId: string) => `game:${gameId}`,
  /** Chat channel */
  chat: (roomId: string) => `chat:${roomId}`,
  /** Parse channel to get type and ID */
  parse: (channel: string): { type: string; id: string } | null => {
    const [type, id] = channel.split(':')
    if (!type) return null
    return { type, id: id ?? '' }
  },
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Whether to receive historical messages on connect */
  replay?: boolean
  /** Number of historical messages to receive */
  replayCount?: number
  /** Filter messages by type */
  eventTypes?: string[]
}

/**
 * Subscription interface
 */
export interface ITranscriptSubscription {
  /** Unique subscription ID */
  readonly id: string
  /** Channel subscribed to */
  readonly channel: string
  /** Whether subscription is active */
  readonly isActive: boolean
  /** Unsubscribe from the channel */
  unsubscribe(): void
}

/**
 * Connection options
 */
export interface ConnectionOptions {
  /** Base URL for the transcript server */
  url: string
  /** Transport type preference */
  transport?: TransportType
  /** Authentication token */
  token?: string
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number
  /** Reconnection delay in ms */
  reconnectDelay?: number
  /** Heartbeat interval in ms */
  heartbeatInterval?: number
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  /** Current state */
  state: ConnectionState
  /** Time connected */
  connectedAt?: Date
  /** Reconnection attempts */
  reconnectAttempts: number
  /** Messages received */
  messagesReceived: number
  /** Messages sent */
  messagesSent: number
  /** Active subscriptions */
  activeSubscriptions: number
  /** Last error */
  lastError?: string
}

/**
 * Message handler callback
 */
export type MessageHandler<TPayload = unknown> = (message: ITranscriptMessage<TPayload>) => void

/**
 * Error handler callback
 */
export type ErrorHandler = (error: Error) => void

/**
 * State change handler callback
 */
export type StateChangeHandler = (state: ConnectionState, previousState: ConnectionState) => void
