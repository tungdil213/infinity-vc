import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { transmitManager, ConnectionState } from '../services/transmit_manager'
import { LobbyTransmitEvent } from '../types/lobby'

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

// Contexte par défaut pour éviter les erreurs
const defaultTransmitContext: TransmitContextType = {
  isConnected: false,
  error: null,
  subscribeToLobbies: async () => () => {},
  subscribeToLobby: async () => () => {},
  subscribeToUserNotifications: async () => () => {},
  unsubscribeFrom: async () => {},
  unsubscribeAll: async () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
}

const TransmitContext = createContext<TransmitContextType>(defaultTransmitContext)

interface TransmitProviderProps {
  children: ReactNode
}

export function TransmitProvider({ children }: TransmitProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventListeners = useRef<Map<string, Set<(event: TransmitEvent) => void>>>(new Map())

  useEffect(() => {
    let mounted = true
    
    console.log('📡 TransmitProvider: Initializing with TransmitManager')
    
    // Écouter les changements d'état de connexion
    const handleStateChange = (event: any) => {
      if (!mounted) return
      
      console.log('📡 TransmitProvider: Connection state changed:', event.data)
      const state = event.data.newState
      
      setIsConnected(state === ConnectionState.CONNECTED)
      
      if (state === ConnectionState.ERROR) {
        setError(event.data.error || 'Connection error')
      } else {
        setError(null)
      }
    }
    
    transmitManager.on('connection_state_changed', handleStateChange)
    
    // Établir la connexion
    transmitManager.connect()
      .then(() => {
        if (mounted) {
          console.log('📡 TransmitProvider: ✅ Connected via TransmitManager')
          setIsConnected(true)
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('📡 TransmitProvider: ❌ Connection failed:', err)
          setError(err.message)
        }
      })

    return () => {
      mounted = false
      console.log('📡 TransmitProvider: Cleaning up')
      transmitManager.off('connection_state_changed', handleStateChange)
      transmitManager.disconnect().catch(console.error)
    }
  }, [])

  const subscribeToLobbies = async (callback: (event: LobbyTransmitEvent) => void) => {
    try {
      console.log('📡 TransmitProvider: subscribeToLobbies called')
      console.log('📡 TransmitProvider: transmitManager state:', {
        isConnected: transmitManager.isConnected(),
        hasSubscribe: typeof transmitManager.subscribe === 'function'
      })
      const unsubscribe = await transmitManager.subscribe<LobbyTransmitEvent>('lobbies', callback)
      console.log('📡 TransmitProvider: ✅ Subscribed to lobbies channel')
      return unsubscribe
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de souscription aux lobbies'
      console.error('📡 TransmitProvider: ❌ Erreur subscribeToLobbies:', errorMessage)
      setError(errorMessage)
      return () => {}
    }
  }

  const subscribeToLobby = async (lobbyUuid: string, callback: (event: LobbyTransmitEvent) => void) => {
    try {
      console.log(`📡 TransmitProvider: subscribeToLobby called for ${lobbyUuid}`)
      const channelName = `lobbies/${lobbyUuid}`
      const unsubscribe = await transmitManager.subscribe<LobbyTransmitEvent>(channelName, callback)
      console.log(`📡 TransmitProvider: ✅ Subscribed to lobby ${lobbyUuid}`)
      return unsubscribe
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de souscription au lobby'
      console.error('📡 TransmitProvider: ❌ Erreur subscribeToLobby:', errorMessage)
      setError(errorMessage)
      return () => {}
    }
  }

  const subscribeToUserNotifications = async (userUuid: string, callback: (event: any) => void) => {
    try {
      console.log(`📡 TransmitProvider: subscribeToUserNotifications called for ${userUuid}`)
      const channelName = `users/${userUuid}`
      const unsubscribe = await transmitManager.subscribe(channelName, callback)
      console.log(`📡 TransmitProvider: ✅ Subscribed to user notifications ${userUuid}`)
      return unsubscribe
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de souscription aux notifications'
      console.error('📡 TransmitProvider: ❌ Erreur subscribeToUserNotifications:', errorMessage)
      setError(errorMessage)
      return () => {}
    }
  }

  const unsubscribeFrom = async (channelName: string) => {
    try {
      await transmitManager.unsubscribe(channelName)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de désouscription'
      console.error('📡 TransmitProvider: ❌ Erreur unsubscribeFrom:', errorMessage)
      setError(errorMessage)
    }
  }

  const unsubscribeAll = async () => {
    try {
      await transmitManager.unsubscribeAll()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de désouscription globale'
      console.error('📡 TransmitProvider: ❌ Erreur unsubscribeAll:', errorMessage)
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
    console.warn('useTransmit: Utilisation du contexte par défaut, TransmitProvider peut-être manquant')
    return defaultTransmitContext
  }
  return context
}
