import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  getTransmitClientStatus,
  getTransmitClient,
  resetTransmitClient,
  transmitLobbyClient,
  type LobbyTransmitEvent,
} from './transmit_client.js'

export interface TransmitEvent {
  type: string
  data: any
  timestamp: string
  channel?: string
}

export interface TransmitContextType {
  isConnected: boolean
  error: string | null
  subscribeToLobbies: (callback: (event: LobbyTransmitEvent) => void) => Promise<() => void>
  subscribeToLobby: (
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ) => Promise<() => void>
  subscribeToUserNotifications: (
    userUuid: string,
    callback: (event: any) => void
  ) => Promise<() => void>
  subscribeToGame: (gameId: string, callback: (event: any) => void) => Promise<() => void>
  unsubscribeFrom: (channelName: string) => Promise<void>
  unsubscribeAll: () => Promise<void>
  addEventListener: (type: string, handler: (event: TransmitEvent) => void) => void
  removeEventListener: (type: string, handler: (event: TransmitEvent) => void) => void
}

const defaultTransmitContext: TransmitContextType = {
  isConnected: false,
  error: null,
  subscribeToLobbies: async () => () => {},
  subscribeToLobby: async () => () => {},
  subscribeToUserNotifications: async () => () => {},
  subscribeToGame: async () => () => {},
  unsubscribeFrom: async () => {},
  unsubscribeAll: async () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}

const TransmitContext = createContext<TransmitContextType>(defaultTransmitContext)

interface TransmitProviderProps {
  children: ReactNode
  enabled?: boolean
}

export function TransmitProvider({ children, enabled = true }: TransmitProviderProps) {
  const [isConnected, setIsConnected] = useState(() => getTransmitClientStatus() === 'connected')
  const [error, setError] = useState<string | null>(null)
  const eventListeners = useRef<Map<string, Set<(event: TransmitEvent) => void>>>(new Map())

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false)
      setError(null)
      transmitLobbyClient.unsubscribeAll().catch(console.error)
      resetTransmitClient()
      return
    }

    const transmitClient = getTransmitClient()

    const handleInitializing = () => {
      setIsConnected(false)
    }

    const handleConnected = () => {
      setIsConnected(true)
      setError(null)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
    }

    const handleReconnecting = () => {
      setIsConnected(false)
    }

    transmitClient.on('initializing', handleInitializing)
    transmitClient.on('connected', handleConnected)
    transmitClient.on('disconnected', handleDisconnected)
    transmitClient.on('reconnecting', handleReconnecting)

    setIsConnected(getTransmitClientStatus() === 'connected')

    return () => {
      transmitClient.off('initializing', handleInitializing)
      transmitClient.off('connected', handleConnected)
      transmitClient.off('disconnected', handleDisconnected)
      transmitClient.off('reconnecting', handleReconnecting)

      transmitLobbyClient.unsubscribeAll().catch(console.error)
    }
  }, [enabled])

  const subscribeToLobbies = async (callback: (event: LobbyTransmitEvent) => void) => {
    try {
      if (!isConnected) {
        throw new Error('Transmit is not connected')
      }
      const unsubscribe = await transmitLobbyClient.subscribeToLobbies(callback)
      return unsubscribe
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to subscribe to lobbies feed'
      console.error('TransmitProvider: subscribeToLobbies failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const subscribeToGame = async (gameId: string, callback: (event: any) => void) => {
    try {
      if (!isConnected) {
        throw new Error('Transmit is not connected')
      }
      const unsubscribe = await transmitLobbyClient.subscribeToGame(gameId, callback)
      return unsubscribe
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to subscribe to game feed'
      console.error('TransmitProvider: subscribeToGame failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const subscribeToLobby = async (
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ) => {
    try {
      if (!isConnected) {
        throw new Error('Transmit is not connected')
      }
      const unsubscribe = await transmitLobbyClient.subscribeToLobby(lobbyUuid, callback)
      return unsubscribe
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to subscribe to lobby feed'
      console.error('TransmitProvider: subscribeToLobby failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const subscribeToUserNotifications = async (userUuid: string, callback: (event: any) => void) => {
    try {
      if (!isConnected) {
        throw new Error('Transmit is not connected')
      }
      const unsubscribe = await transmitLobbyClient.subscribeToUserNotifications(userUuid, callback)
      return unsubscribe
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to subscribe to user notifications'
      console.error('TransmitProvider: subscribeToUserNotifications failed:', errorMessage)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const unsubscribeFrom = async (channelName: string) => {
    try {
      await transmitLobbyClient.unsubscribeFrom(channelName)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from channel'
      console.error('TransmitProvider: unsubscribeFrom failed:', errorMessage)
      setError(errorMessage)
    }
  }

  const unsubscribeAll = async () => {
    try {
      await transmitLobbyClient.unsubscribeAll()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from all channels'
      console.error('TransmitProvider: unsubscribeAll failed:', errorMessage)
      setError(errorMessage)
    }
  }

  const addEventListener = (type: string, handler: (event: TransmitEvent) => void) => {
    if (!eventListeners.current.has(type)) {
      eventListeners.current.set(type, new Set())
    }
    eventListeners.current.get(type)!.add(handler)
  }

  const removeEventListener = (type: string, handler: (event: TransmitEvent) => void) => {
    const listeners = eventListeners.current.get(type)
    if (listeners) {
      listeners.delete(handler)
      if (listeners.size === 0) {
        eventListeners.current.delete(type)
      }
    }
  }

  const contextValue: TransmitContextType = {
    isConnected,
    error,
    subscribeToLobbies,
    subscribeToLobby,
    subscribeToUserNotifications,
    subscribeToGame,
    unsubscribeFrom,
    unsubscribeAll,
    addEventListener,
    removeEventListener,
  }

  return <TransmitContext.Provider value={contextValue}>{children}</TransmitContext.Provider>
}

export function useTransmit(): TransmitContextType {
  const context = useContext(TransmitContext)
  if (!context || context === defaultTransmitContext) {
    console.warn('useTransmit: using default context, TransmitProvider may be missing')
    return defaultTransmitContext
  }
  return context
}
