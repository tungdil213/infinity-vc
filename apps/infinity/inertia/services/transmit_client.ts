import { Transmit } from '@adonisjs/transmit-client'
import { LobbyTransmitEvent } from '../types/lobby'

/**
 * Client Transmit configuré pour l'application
 * Respecte les patterns documentés avec logging standardisé
 */
export const transmitClient = new Transmit({
  baseUrl: 'http://localhost:52398',
  beforeSubscribe: (request: RequestInit) => {
    console.log('📡 TransmitClient: Preparing subscription request')
    // Ajouter les headers d'authentification si nécessaire
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      if (!request.headers) {
        request.headers = {}
      }
      ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
    }
  },
  beforeUnsubscribe: (request: RequestInit) => {
    console.log('📡 TransmitClient: Preparing unsubscription request')
    // Ajouter les headers d'authentification si nécessaire
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      if (!request.headers) {
        request.headers = {}
      }
      ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
    }
  },
  onReconnectAttempt: (attempt) => {
    console.log(`📡 TransmitClient: Reconnection attempt #${attempt}`)
  },
  onReconnectFailed: () => {
    console.error('📡 TransmitClient: Reconnection failed - falling back to polling')
  },
  onSubscribeFailed: (response) => {
    console.error('📡 TransmitClient: Subscription failed:', response)
  },
  onSubscription: (channel) => {
    console.log(`📡 TransmitClient: Successfully subscribed to ${channel}`)
  },
  onUnsubscription: (channel) => {
    console.log(`📡 TransmitClient: Unsubscribed from ${channel}`)
  },
})

/**
 * Service de gestion des événements de lobby via Transmit
 */
export class TransmitLobbyClient {
  private subscriptions = new Map<string, any>()

  /**
   * S'abonner aux événements globaux des lobbies
   */
  async subscribeToLobbies(callback: (event: LobbyTransmitEvent) => void): Promise<() => void> {
    const subscription = transmitClient.subscription('lobbies')

    subscription.onMessage((data: LobbyTransmitEvent) => {
      callback(data)
    })

    await subscription.create()
    this.subscriptions.set('lobbies', subscription)

    return () => {
      subscription.delete()
      this.subscriptions.delete('lobbies')
    }
  }

  /**
   * S'abonner aux événements d'un lobby spécifique
   */
  async subscribeToLobby(
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ): Promise<() => void> {
    const channelName = `lobbies/${lobbyUuid}`
    const subscription = transmitClient.subscription(channelName)

    subscription.onMessage((data: LobbyTransmitEvent) => {
      callback(data)
    })

    await subscription.create()
    this.subscriptions.set(channelName, subscription)

    return () => {
      subscription.delete()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * S'abonner aux notifications d'un utilisateur
   */
  async subscribeToUserNotifications(
    userUuid: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    const channelName = `users/${userUuid}`
    const subscription = transmitClient.subscription(channelName)

    subscription.onMessage((data: any) => {
      callback(data)
    })

    await subscription.create()
    this.subscriptions.set(channelName, subscription)

    return () => {
      subscription.delete()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Se désabonner d'un channel spécifique
   */
  async unsubscribeFrom(channelName: string): Promise<void> {
    const subscription = this.subscriptions.get(channelName)
    if (subscription) {
      await subscription.delete()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Se désabonner de tous les channels
   */
  async unsubscribeAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.values()).map((subscription) =>
      subscription.delete()
    )
    await Promise.all(promises)
    this.subscriptions.clear()
  }

  /**
   * Obtenir la liste des souscriptions actives
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// Instance globale du client
export const transmitLobbyClient = new TransmitLobbyClient()
