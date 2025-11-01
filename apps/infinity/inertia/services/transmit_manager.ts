import { Transmit } from '@adonisjs/transmit-client'
import { LobbyTransmitEvent } from '../types/lobby'

/**
 * États de connexion du TransmitManager
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

/**
 * Interface pour les événements du manager
 */
export interface TransmitManagerEvent {
  type:
    | 'connection_state_changed'
    | 'subscription_created'
    | 'subscription_failed'
    | 'message_received'
  data: any
  timestamp: Date
}

/**
 * Gestionnaire d'événements générique
 */
type EventHandler<T = any> = (event: T) => void

/**
 * TransmitManager - Gestionnaire centralisé et robuste pour Transmit
 *
 * Architecture:
 * - Gère la connexion SSE
 * - Dispatche les événements via EventEmitter pattern
 * - Gère les reconnexions automatiques
 * - Logs détaillés pour debugging
 * - Fallback gracieux en cas d'erreur
 */
export class TransmitManager {
  private transmitClient: Transmit
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private subscriptions = new Map<string, any>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  constructor() {
    console.log('📡 TransmitManager: Initializing...')

    this.transmitClient = new Transmit({
      baseUrl: window.location.origin,

      beforeSubscribe: (request: RequestInit) => {
        console.log('📡 TransmitManager: Preparing subscription request')
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
          if (!request.headers) {
            request.headers = {}
          }
          ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
        }
      },

      beforeUnsubscribe: (request: RequestInit) => {
        console.log('📡 TransmitManager: Preparing unsubscription request')
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
          if (!request.headers) {
            request.headers = {}
          }
          ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
        }
      },

      onReconnectAttempt: (attempt) => {
        console.warn(`📡 TransmitManager: 🔄 Reconnection attempt #${attempt}`)
        this.setState(ConnectionState.RECONNECTING)
        this.reconnectAttempts = attempt
      },

      onReconnectFailed: () => {
        console.error('📡 TransmitManager: ❌ Reconnection failed permanently')
        this.setState(ConnectionState.ERROR)
        this.emit('connection_state_changed', {
          state: ConnectionState.ERROR,
          error: 'Reconnection failed',
        })
      },

      onSubscribeFailed: (response) => {
        console.error('📡 TransmitManager: ❌ Subscription failed:', response)
        this.emit('subscription_failed', { response })
      },

      onSubscription: (channel) => {
        console.log(`📡 TransmitManager: ✅ Successfully subscribed to channel: ${channel}`)
        this.emit('subscription_created', { channel })
      },

      onUnsubscription: (channel) => {
        console.log(`📡 TransmitManager: 📤 Unsubscribed from channel: ${channel}`)
      },
    })

    console.log('📡 TransmitManager: ✅ Initialized')
  }

  /**
   * Change l'état de connexion et notifie les observers
   */
  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      console.log(`📡 TransmitManager: State changed: ${oldState} → ${newState}`)
      this.emit('connection_state_changed', {
        oldState,
        newState,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Établir la connexion initiale
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      console.log('📡 TransmitManager: Already connected')
      return
    }

    console.log('📡 TransmitManager: 🔌 Establishing connection...')
    this.setState(ConnectionState.CONNECTING)

    try {
      // La connexion SSE est établie lors de la première subscription
      // On marque comme connecté ici
      this.setState(ConnectionState.CONNECTED)
      this.reconnectAttempts = 0
      console.log('📡 TransmitManager: ✅ Connection established')
    } catch (error) {
      console.error('📡 TransmitManager: ❌ Connection failed:', error)
      this.setState(ConnectionState.ERROR)
      throw error
    }
  }

  /**
   * S'abonner à un canal avec callback
   */
  async subscribe<T = any>(channelName: string, callback: (data: T) => void): Promise<() => void> {
    console.log(`📡 TransmitManager: 📥 Subscribing to channel: ${channelName}`)

    // Vérifier l'état de connexion
    if (this.state !== ConnectionState.CONNECTED) {
      console.log('📡 TransmitManager: Not connected, establishing connection first...')
      await this.connect()
    }

    try {
      // Vérifier si déjà abonné
      if (this.subscriptions.has(channelName)) {
        console.warn(
          `📡 TransmitManager: ⚠️ Already subscribed to ${channelName}, reusing subscription`
        )
        return () => this.unsubscribe(channelName)
      }

      const subscription = this.transmitClient.subscription(channelName)

      // Configurer le handler de messages
      subscription.onMessage((data: T) => {
        console.log(`📡 TransmitManager: 📨 Message received on ${channelName}:`, data)

        // Appeler le callback
        try {
          callback(data)
        } catch (error) {
          console.error(`📡 TransmitManager: ❌ Error in callback for ${channelName}:`, error)
        }

        // Émettre l'événement global
        this.emit('message_received', {
          channel: channelName,
          data,
          timestamp: new Date(),
        })
      })

      // Créer la subscription (établit la connexion SSE)
      console.log(`📡 TransmitManager: Creating subscription for ${channelName}...`)
      await subscription.create()

      this.subscriptions.set(channelName, subscription)
      console.log(`📡 TransmitManager: ✅ Subscribed to ${channelName}`)
      console.log(
        `📡 TransmitManager: Active subscriptions: ${this.getActiveChannels().join(', ')}`
      )

      // Retourner la fonction d'unsubscribe
      return () => this.unsubscribe(channelName)
    } catch (error) {
      console.error(`📡 TransmitManager: ❌ Failed to subscribe to ${channelName}:`, error)
      throw error
    }
  }

  /**
   * Se désabonner d'un canal
   */
  async unsubscribe(channelName: string): Promise<void> {
    console.log(`📡 TransmitManager: 📤 Unsubscribing from ${channelName}`)

    const subscription = this.subscriptions.get(channelName)
    if (subscription) {
      try {
        await subscription.delete()
        this.subscriptions.delete(channelName)
        console.log(`📡 TransmitManager: ✅ Unsubscribed from ${channelName}`)
      } catch (error) {
        console.error(`📡 TransmitManager: ❌ Error unsubscribing from ${channelName}:`, error)
      }
    } else {
      console.warn(`📡 TransmitManager: ⚠️ Not subscribed to ${channelName}`)
    }
  }

  /**
   * Se désabonner de tous les canaux
   */
  async unsubscribeAll(): Promise<void> {
    console.log('📡 TransmitManager: 📤 Unsubscribing from all channels...')

    const channels = Array.from(this.subscriptions.keys())
    const promises = channels.map((channel) => this.unsubscribe(channel))

    await Promise.allSettled(promises)
    this.subscriptions.clear()

    console.log('📡 TransmitManager: ✅ Unsubscribed from all channels')
  }

  /**
   * Déconnecter complètement
   */
  async disconnect(): Promise<void> {
    console.log('📡 TransmitManager: 🔌 Disconnecting...')

    await this.unsubscribeAll()
    this.setState(ConnectionState.DISCONNECTED)

    console.log('📡 TransmitManager: ✅ Disconnected')
  }

  /**
   * EventEmitter pattern - Ajouter un listener
   */
  on<T = any>(eventType: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler as EventHandler)
  }

  /**
   * EventEmitter pattern - Retirer un listener
   */
  off<T = any>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler as EventHandler)
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType)
      }
    }
  }

  /**
   * EventEmitter pattern - Émettre un événement
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler({ type: eventType, data, timestamp: new Date() })
        } catch (error) {
          console.error(`📡 TransmitManager: ❌ Error in event handler for ${eventType}:`, error)
        }
      })
    }
  }

  /**
   * Obtenir l'état de connexion actuel
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED
  }

  /**
   * Obtenir les canaux actifs
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * Obtenir le nombre de tentatives de reconnexion
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  /**
   * Obtenir des statistiques
   */
  getStats() {
    return {
      state: this.state,
      activeChannels: this.getActiveChannels(),
      subscriptionCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      eventHandlersCount: this.eventHandlers.size,
    }
  }
}

// Instance singleton globale
export const transmitManager = new TransmitManager()
