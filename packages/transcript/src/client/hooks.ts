/**
 * React hooks for transcript client
 * These will only work when React is available
 */

import type {
  ITranscriptMessage,
  ConnectionState,
  SubscriptionOptions,
  MessageHandler,
} from '../core/types.js'
import type { ITranscriptClient } from './transcript-client.js'

// Types for React hooks (avoid direct React import for optional peer dep)
type SetStateAction<S> = S | ((prevState: S) => S)
type Dispatch<A> = (value: A) => void

/**
 * Hook result for useTranscript
 */
export interface UseTranscriptResult {
  /** Current connection state */
  state: ConnectionState
  /** Whether connected */
  isConnected: boolean
  /** Connect to server */
  connect: () => Promise<void>
  /** Disconnect from server */
  disconnect: () => void
  /** Last error */
  error: Error | null
}

/**
 * Hook result for useSubscription
 */
export interface UseSubscriptionResult<TPayload> {
  /** Latest message received */
  message: ITranscriptMessage<TPayload> | null
  /** All messages received */
  messages: ITranscriptMessage<TPayload>[]
  /** Whether subscription is active */
  isActive: boolean
  /** Clear message history */
  clear: () => void
}

/**
 * Options for useSubscription hook
 */
export interface UseSubscriptionOptions extends SubscriptionOptions {
  /** Maximum messages to keep in history */
  maxMessages?: number
  /** Whether to auto-subscribe on mount */
  autoSubscribe?: boolean
}

/**
 * Creates React hooks for a transcript client
 * Must be called with React's useState, useEffect, useCallback, useRef
 */
export function createTranscriptHooks(
  React: {
    useState: <S>(initial: S | (() => S)) => [S, Dispatch<SetStateAction<S>>]
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void
    useCallback: <T extends (...args: unknown[]) => unknown>(callback: T, deps: unknown[]) => T
    useRef: <T>(initial: T) => { current: T }
    createContext: <T>(defaultValue: T) => { Provider: unknown; Consumer: unknown }
    useContext: <T>(context: { Provider: unknown }) => T
  }
) {
  const { useState, useEffect, useCallback, useRef, createContext, useContext } = React

  // Create context for the client
  const TranscriptContext = createContext<ITranscriptClient | null>(null)

  /**
   * Hook to access the transcript client
   */
  function useTranscriptClient(): ITranscriptClient {
    const client = useContext(TranscriptContext as { Provider: unknown })
    if (!client) {
      throw new Error('useTranscriptClient must be used within TranscriptProvider')
    }
    return client as ITranscriptClient
  }

  /**
   * Hook for transcript connection state
   */
  function useTranscript(client: ITranscriptClient): UseTranscriptResult {
    const [state, setState] = useState<ConnectionState>(client.state)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
      const unsubscribeState = client.onStateChange((newState) => {
        setState(newState)
      })

      const unsubscribeError = client.onError((err) => {
        setError(err)
      })

      return () => {
        unsubscribeState()
        unsubscribeError()
      }
    }, [client])

    const connect = useCallback(async () => {
      setError(null)
      try {
        await client.connect()
      } catch (err) {
        setError(err as Error)
        throw err
      }
    }, [client])

    const disconnect = useCallback(() => {
      client.disconnect()
    }, [client])

    return {
      state,
      isConnected: state === 'connected',
      connect,
      disconnect,
      error,
    }
  }

  /**
   * Hook for subscribing to a channel
   */
  function useSubscription<TPayload = unknown>(
    client: ITranscriptClient,
    channel: string,
    options?: UseSubscriptionOptions
  ): UseSubscriptionResult<TPayload> {
    const [message, setMessage] = useState<ITranscriptMessage<TPayload> | null>(null)
    const [messages, setMessages] = useState<ITranscriptMessage<TPayload>[]>([])
    const [isActive, setIsActive] = useState(false)
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

    const maxMessages = options?.maxMessages ?? 100

    useEffect(() => {
      if (options?.autoSubscribe === false) return

      const handler: MessageHandler<TPayload> = (msg) => {
        setMessage(msg)
        setMessages((prev) => {
          const newMessages = [...prev, msg]
          if (newMessages.length > maxMessages) {
            return newMessages.slice(-maxMessages)
          }
          return newMessages
        })
      }

      const subscription = client.subscribe<TPayload>(channel, handler, options)
      subscriptionRef.current = subscription
      setIsActive(true)

      return () => {
        subscription.unsubscribe()
        subscriptionRef.current = null
        setIsActive(false)
      }
    }, [client, channel, maxMessages])

    const clear = useCallback(() => {
      setMessage(null)
      setMessages([])
    }, [])

    return {
      message,
      messages,
      isActive,
      clear,
    }
  }

  /**
   * Hook for subscribing to multiple channels
   */
  function useChannels<TPayload = unknown>(
    client: ITranscriptClient,
    channels: string[],
    options?: UseSubscriptionOptions
  ): Map<string, UseSubscriptionResult<TPayload>> {
    const [results, setResults] = useState<Map<string, UseSubscriptionResult<TPayload>>>(new Map())

    useEffect(() => {
      const channelResults = new Map<string, {
        messages: ITranscriptMessage<TPayload>[]
        message: ITranscriptMessage<TPayload> | null
      }>()

      const subscriptions = channels.map((channel) => {
        channelResults.set(channel, { messages: [], message: null })

        return client.subscribe<TPayload>(channel, (msg) => {
          const current = channelResults.get(channel)!
          current.message = msg
          current.messages = [...current.messages, msg].slice(-(options?.maxMessages ?? 100))

          // Trigger re-render
          setResults(new Map(channelResults) as Map<string, UseSubscriptionResult<TPayload>>)
        }, options)
      })

      return () => {
        subscriptions.forEach((sub) => sub.unsubscribe())
      }
    }, [client, channels.join(','), options?.maxMessages])

    return results
  }

  return {
    TranscriptContext,
    useTranscriptClient,
    useTranscript,
    useSubscription,
    useChannels,
  }
}

/**
 * Type for the hooks created by createTranscriptHooks
 */
export type TranscriptHooks = ReturnType<typeof createTranscriptHooks>
