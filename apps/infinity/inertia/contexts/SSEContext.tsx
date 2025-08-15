import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

export interface SSEEvent {
  id: string
  type: string
  data: any
  timestamp: string
  channel?: string
}

interface SSEContextType {
  isConnected: boolean
  connectionId: string | null
  error: string | null
  subscribeToChannel: (channel: string) => Promise<any>
  unsubscribeFromChannel: (channel: string) => Promise<any>
  addEventListener: (type: string, handler: (event: SSEEvent) => void) => void
  removeEventListener: (type: string, handler: (event: SSEEvent) => void) => void
}

const SSEContext = createContext<SSEContextType | null>(null)

interface SSEProviderProps {
  children: ReactNode
}

export function SSEProvider({ children }: SSEProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const eventListenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(new Map())

  const maxReconnectAttempts = 5
  const reconnectInterval = 3000

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      const eventSource = new EventSource('/api/v1/sse/connect', {
        withCredentials: true,
      })

      eventSource.onopen = () => {
        console.log('SSE Connected globally')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data)
          
          // Handle connection established event
          if (sseEvent.type === 'connection.established') {
            setConnectionId(sseEvent.data.connectionId)
          }
          
          // Dispatch to registered listeners
          const listeners = eventListenersRef.current.get(sseEvent.type)
          if (listeners) {
            listeners.forEach(handler => handler(sseEvent))
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      eventSource.onerror = (event) => {
        console.error('SSE Error globally:', event)
        setIsConnected(false)
        setError('SSE connection error')

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
      })

      // Listen for specific event types
      const eventTypes = [
        'lobby.player.joined',
        'lobby.player.left', 
        'lobby.game.started',
        'lobby.created',
        'lobby.updated',
        'lobby.deleted'
      ]

      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          const customEvent = event as MessageEvent
          try {
            const sseEvent: SSEEvent = {
              id: Date.now().toString(),
              type: eventType,
              data: JSON.parse(customEvent.data),
              timestamp: new Date().toISOString(),
            }
            
            // Dispatch to registered listeners
            const listeners = eventListenersRef.current.get(eventType)
            if (listeners) {
              listeners.forEach(handler => handler(sseEvent))
            }
          } catch (err) {
            console.error(`Failed to parse ${eventType} event:`, err)
          }
        })
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

  const addEventListener = (type: string, handler: (event: SSEEvent) => void) => {
    if (!eventListenersRef.current.has(type)) {
      eventListenersRef.current.set(type, new Set())
    }
    eventListenersRef.current.get(type)!.add(handler)
  }

  const removeEventListener = (type: string, handler: (event: SSEEvent) => void) => {
    const listeners = eventListenersRef.current.get(type)
    if (listeners) {
      listeners.delete(handler)
      if (listeners.size === 0) {
        eventListenersRef.current.delete(type)
      }
    }
  }

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  const contextValue: SSEContextType = {
    isConnected,
    connectionId,
    error,
    subscribeToChannel,
    unsubscribeFromChannel,
    addEventListener,
    removeEventListener,
  }

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  )
}

export function useSSEContext() {
  const context = useContext(SSEContext)
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider')
  }
  return context
}
