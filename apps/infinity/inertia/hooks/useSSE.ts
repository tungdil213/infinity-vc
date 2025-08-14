import { useEffect, useRef, useState } from 'react'

export interface SSEEvent {
  id: string
  type: string
  data: any
  timestamp: string
  channel?: string
}

export interface UseSSEOptions {
  onMessage?: (event: SSEEvent) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useSSE(options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options

  const connect = () => {
    if (eventSourceRef.current) {
      return // Already connected
    }

    try {
      const eventSource = new EventSource('/api/v1/sse/connect', {
        withCredentials: true,
      })

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        onOpen?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data)
          
          // Handle connection established event
          if (sseEvent.type === 'connection.established') {
            setConnectionId(sseEvent.data.connectionId)
          }
          
          onMessage?.(sseEvent)
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      eventSource.onerror = (event) => {
        setIsConnected(false)
        setError('SSE connection error')
        onError?.(event)

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            eventSource.close()
            eventSourceRef.current = null
            connect()
          }, reconnectInterval)
        }
      }

      eventSource.addEventListener('close', () => {
        setIsConnected(false)
        setConnectionId(null)
        onClose?.()
      })

      // Listen for specific event types
      eventSource.addEventListener('lobby.player.joined', (event) => {
        const customEvent = event as MessageEvent
        try {
          const sseEvent: SSEEvent = {
            id: Date.now().toString(),
            type: 'lobby.player.joined',
            data: JSON.parse(customEvent.data),
            timestamp: new Date().toISOString(),
          }
          onMessage?.(sseEvent)
        } catch (err) {
          console.error('Failed to parse lobby.player.joined event:', err)
        }
      })

      eventSource.addEventListener('lobby.player.left', (event) => {
        const customEvent = event as MessageEvent
        try {
          const sseEvent: SSEEvent = {
            id: Date.now().toString(),
            type: 'lobby.player.left',
            data: JSON.parse(customEvent.data),
            timestamp: new Date().toISOString(),
          }
          onMessage?.(sseEvent)
        } catch (err) {
          console.error('Failed to parse lobby.player.left event:', err)
        }
      })

      eventSource.addEventListener('lobby.game.started', (event) => {
        const customEvent = event as MessageEvent
        try {
          const sseEvent: SSEEvent = {
            id: Date.now().toString(),
            type: 'lobby.game.started',
            data: JSON.parse(customEvent.data),
            timestamp: new Date().toISOString(),
          }
          onMessage?.(sseEvent)
        } catch (err) {
          console.error('Failed to parse lobby.game.started event:', err)
        }
      })

      eventSourceRef.current = eventSource
    } catch (err) {
      setError('Failed to establish SSE connection')
      console.error('SSE connection error:', err)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setConnectionId(null)
  }

  const subscribeToChannel = async (channel: string) => {
    if (!connectionId) {
      throw new Error('No active SSE connection')
    }

    try {
      const response = await fetch('/api/v1/sse/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          channel,
          connectionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to subscribe to channel: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to subscribe to channel:', err)
      throw err
    }
  }

  const unsubscribeFromChannel = async (channel: string) => {
    if (!connectionId) {
      throw new Error('No active SSE connection')
    }

    try {
      const response = await fetch('/api/v1/sse/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          channel,
          connectionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to unsubscribe from channel: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Failed to unsubscribe from channel:', err)
      throw err
    }
  }

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    connectionId,
    error,
    connect,
    disconnect,
    subscribeToChannel,
    unsubscribeFromChannel,
  }
}
