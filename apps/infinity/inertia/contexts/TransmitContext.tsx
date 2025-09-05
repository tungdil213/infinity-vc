import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { transmitLobbyClient, LobbyTransmitEvent } from '../services/transmit_client'

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
  subscribeToLobby: (lobbyUuid: string, callback: (event: LobbyTransmitEvent) => void) => Promise<() => void>
  subscribeToUserNotifications: (userUuid: string, callback: (event: any) => void) => Promise<() => void>
  unsubscribeFrom: (channelName: string) => Promise<void>
  unsubscribeAll: () => Promise<void>
  addEventListener: (type: string, handler: (event: TransmitEvent) => void) => void
  removeEventListener: (type: string, handler: (event: TransmitEvent) => void) => void
}

const TransmitContext = createContext<TransmitContextType | null>(null)

interface TransmitProviderProps {
  children: ReactNode
}

export function TransmitProvider({ children }: TransmitProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventListeners = useRef<Map<string, Set<(event: TransmitEvent) => void>>>(new Map())

  useEffect(() => {
    // Simuler la connexion (Transmit gère cela automatiquement)
    setIsConnected(true)
    setError(null)

    return () => {
      // Cleanup lors du démontage
      transmitLobbyClient.unsubscribeAll()
    }
  }, [])

  const subscribeToLobbies = async (callback: (event: LobbyTransmitEvent) => void) => {
    try {
      const unsubscribe = await transmitLobbyClient.subscribeToLobbies(callback)
      return unsubscribe
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de souscription aux lobbies')
      throw err
    }
  }

  const subscribeToLobby = async (lobbyUuid: string, callback: (event: LobbyTransmitEvent) => void) => {
    try {
      const unsubscribe = await transmitLobbyClient.subscribeToLobby(lobbyUuid, callback)
      return unsubscribe
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de souscription au lobby')
      throw err
    }
  }

  const subscribeToUserNotifications = async (userUuid: string, callback: (event: any) => void) => {
    try {
      const unsubscribe = await transmitLobbyClient.subscribeToUserNotifications(userUuid, callback)
      return unsubscribe
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de souscription aux notifications')
      throw err
    }
  }

  const unsubscribeFrom = async (channelName: string) => {
    try {
      await transmitLobbyClient.unsubscribeFrom(channelName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de désouscription')
    }
  }

  const unsubscribeAll = async () => {
    try {
      await transmitLobbyClient.unsubscribeAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de désouscription globale')
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
    unsubscribeFrom,
    unsubscribeAll,
    addEventListener,
    removeEventListener,
  }

  return <TransmitContext.Provider value={contextValue}>{children}</TransmitContext.Provider>
}

export function useTransmit(): TransmitContextType {
  const context = useContext(TransmitContext)
  if (!context) {
    throw new Error('useTransmit must be used within a TransmitProvider')
  }
  return context
}
