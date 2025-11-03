import { Transmit } from '@adonisjs/transmit-client'
import { LobbyTransmitEvent } from '../types/lobby'
import { createBrowserLogger } from '../utils/browser_logger'

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
  private logger = createBrowserLogger('TransmitManager')
  private transmitClient: Transmit
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private subscriptions = new Map<string, any>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  constructor() {
    this.logger.debug('Initializing...')

    this.transmitClient = new Transmit({
      baseUrl: window.location.origin,

      beforeSubscribe: (request: RequestInit) => {
        this.logger.debug('Preparing subscription request')
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
          if (!request.headers) {
            request.headers = {}
          }
          ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
        }
      },

      beforeUnsubscribe: (request: RequestInit) => {
        this.logger.debug('Preparing unsubscription request')
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
          if (!request.headers) {
            request.headers = {}
          }
          ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
        }
      },

      onReconnectAttempt: (attempt) => {
        this.logger.warn({ attempt }, 'Reconnection attempt')
        this.setState(ConnectionState.RECONNECTING)
        this.reconnectAttempts = attempt
      },

      onReconnectFailed: () => {
        this.logger.error('Reconnection failed permanently')
        this.setState(ConnectionState.ERROR)
        this.emit('connection_state_changed', {
          state: ConnectionState.ERROR,
          error: 'Reconnection failed',
        })
      },

      onSubscribeFailed: (response) => {
        this.logger.error({ response }, 'Subscription failed')
        this.emit('subscription_failed', { response })
      },

      onSubscription: (channel) => {
        this.logger.info({ channel }, 'Successfully subscribed')
        this.emit('subscription_created', { channel })
      },

      onUnsubscription: (channel) => {
        this.logger.info({ channel }, 'Unsubscribed from channel')
      },
    })

    this.logger.info('Initialized')
  }

  /**
   * Change l'état de connexion et notifie les observers
   */
  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      this.logger.info({ oldState, newState }, 'State changed')
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
      this.logger.debug('Already connected')
      return
    }

    this.logger.info('Establishing connection...')
    this.setState(ConnectionState.CONNECTING)

    try {
      // La connexion SSE est établie lors de la première subscription
      // On marque comme connecté ici
      this.setState(ConnectionState.CONNECTED)
      this.reconnectAttempts = 0
      this.logger.info('Connection established')
    } catch (error) {
      this.logger.error({ error }, 'Connection failed')
      this.setState(ConnectionState.ERROR)
      throw error
    }
  }

  /**
   * S'abonner à un canal avec callback
   */
  async subscribe<T = any>(channelName: string, callback: (data: T) => void): Promise<() => void> {
    this.logger.info({ channelName }, 'Subscribing to channel')

    // Vérifier l'état de connexion
    if (this.state !== ConnectionState.CONNECTED) {
      this.logger.debug('Not connected, establishing connection first')
      await this.connect()
    }

    try {
      // Vérifier si déjà abonné
      if (this.subscriptions.has(channelName)) {
        this.logger.warn({ channelName }, 'Already subscribed, reusing subscription')
        return () => this.unsubscribe(channelName)
      }

      const subscription = this.transmitClient.subscription(channelName)

      // Configurer le handler de messages
      subscription.onMessage((data: T) => {
        this.logger.debug({ channelName, data }, 'Message received')

        // Appeler le callback
        try {
          callback(data)
        } catch (error) {
          this.logger.error({ error, channelName }, 'Error in callback')
        }

        // Émettre l'événement global
        this.emit('message_received', {
          channel: channelName,
          data,
          timestamp: new Date(),
        })
      })

      // Créer la subscription (établit la connexion SSE)
      this.logger.debug({ channelName }, 'Creating subscription')
      await subscription.create()

      this.subscriptions.set(channelName, subscription)
      this.logger.info(
        { channelName, activeChannels: this.getActiveChannels() },
        'Subscribed successfully'
      )

      // Retourner la fonction d'unsubscribe
      return () => this.unsubscribe(channelName)
    } catch (error) {
      this.logger.error({ error, channelName }, 'Failed to subscribe')
      throw error
    }
  }

  /**
   * Se désabonner d'un canal
   */
  async unsubscribe(channelName: string): Promise<void> {
    this.logger.info({ channelName }, 'Unsubscribing')

    const subscription = this.subscriptions.get(channelName)
    if (subscription) {
      try {
        await subscription.delete()
        this.subscriptions.delete(channelName)
        this.logger.info({ channelName }, 'Unsubscribed')
      } catch (error) {
        this.logger.error({ error, channelName }, 'Error unsubscribing')
      }
    } else {
      this.logger.warn({ channelName }, 'Not subscribed')
    }
  }

  /**
   * Se désabonner de tous les canaux
   */
  async unsubscribeAll(): Promise<void> {
    this.logger.info('Unsubscribing from all channels')

    const channels = Array.from(this.subscriptions.keys())
    const promises = channels.map((channel) => this.unsubscribe(channel))

    await Promise.allSettled(promises)
    this.subscriptions.clear()

    this.logger.info('Unsubscribed from all channels')
  }

  /**
   * Déconnecter complètement
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting')

    await this.unsubscribeAll()
    this.setState(ConnectionState.DISCONNECTED)

    this.logger.info('Disconnected')
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
          this.logger.error({ error, eventType }, 'Error in event handler')
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
