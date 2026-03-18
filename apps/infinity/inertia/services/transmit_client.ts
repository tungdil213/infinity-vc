import { Transmit, type Subscription } from '@adonisjs/transmit-client'

type BrowserLikeGlobals = {
  location?: {
    origin?: string
  }
  document?: {
    querySelector?: (selector: string) => { getAttribute?: (name: string) => string | null } | null
  }
}

const browserGlobals = globalThis as typeof globalThis & BrowserLikeGlobals

function getCsrfToken(): string | undefined {
  return (
    browserGlobals.document
      ?.querySelector?.('meta[name="csrf-token"]')
      ?.getAttribute?.('content') ?? undefined
  )
}

type TransmitClientStatus = 'initializing' | 'connected' | 'disconnected' | 'reconnecting'

let transmitClientStatus: TransmitClientStatus = 'initializing'
let transmitClientInstance: Transmit | null = null

function createTransmitClient(): Transmit {
  const transmitClient = new Transmit({
    baseUrl: browserGlobals.location?.origin ?? '',
    maxReconnectAttempts: 50,
    beforeSubscribe: (request: RequestInit) => {
      // Ajouter les headers d'authentification si nécessaire
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        if (!request.headers) {
          request.headers = {}
        }
        ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
      }
    },
    beforeUnsubscribe: (request: RequestInit) => {
      // Ajouter les headers d'authentification si nécessaire
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        if (!request.headers) {
          request.headers = {}
        }
        ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
      }
    },
    onReconnectAttempt: (attempt) => {
      console.log(`Tentative de reconnexion Transmit #${attempt}`)
    },
    onReconnectFailed: () => {
      console.error('Échec de la reconnexion Transmit')
    },
    onSubscribeFailed: (response) => {
      console.error('Échec de souscription Transmit:', response)
    },
    onSubscription: (channel) => {
      console.log(`Souscription Transmit réussie au channel: ${channel}`)
    },
    onUnsubscription: (channel) => {
      console.log(`Désouscription Transmit du channel: ${channel}`)
    },
  })

  transmitClient.on('initializing', () => {
    transmitClientStatus = 'initializing'
  })

  transmitClient.on('connected', () => {
    transmitClientStatus = 'connected'
  })

  transmitClient.on('disconnected', () => {
    transmitClientStatus = 'disconnected'
  })

  transmitClient.on('reconnecting', () => {
    transmitClientStatus = 'reconnecting'
  })

  return transmitClient
}

export function getTransmitClient(): Transmit {
  if (!transmitClientInstance) {
    transmitClientStatus = 'initializing'
    transmitClientInstance = createTransmitClient()
  }

  return transmitClientInstance
}

export function resetTransmitClient(): void {
  if (transmitClientInstance) {
    transmitClientInstance.close()
    transmitClientInstance = null
  }

  transmitClientStatus = 'initializing'
}

export function getTransmitClientStatus(): TransmitClientStatus {
  return transmitClientStatus
}

/**
 * Interface pour les événements de lobby reçus via Transmit
 */
export interface LobbyTransmitEvent {
  type: string
  lobbyUuid: string
  lobby: any
  timestamp: string
  player?: {
    uuid: string
    nickName: string
  }
  playerCount?: number
  oldStatus?: string
  newStatus?: string
  status?: string
  gameUuid?: string
  gameId?: string
}

/**
 * Service de gestion des événements de lobby via Transmit
 */
export class TransmitLobbyClient {
  private subscriptions = new Map<string, Subscription>()

  private async subscribeToChannel<T>(
    channelName: string,
    callback: (event: T) => void
  ): Promise<() => void> {
    const transmitClient = getTransmitClient()
    const subscription =
      this.subscriptions.get(channelName) ?? transmitClient.subscription(channelName)

    this.subscriptions.set(channelName, subscription)

    const removeHandler = subscription.onMessage((data: T) => {
      callback(data)
    })

    await subscription.create()

    if (!subscription.isCreated) {
      removeHandler()
      if (subscription.handlerCount === 0) {
        this.subscriptions.delete(channelName)
      }

      throw new Error(`Échec de souscription Transmit au channel: ${channelName}`)
    }

    return () => {
      removeHandler()

      if (subscription.handlerCount > 0) {
        return
      }

      void subscription.delete()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * S'abonner aux événements globaux des lobbies
   */
  async subscribeToLobbies(callback: (event: LobbyTransmitEvent) => void): Promise<() => void> {
    return this.subscribeToChannel('lobbies', callback)
  }

  /**
   * S'abonner aux événements d'un lobby spécifique
   */
  async subscribeToLobby(
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ): Promise<() => void> {
    const channelName = `lobbies/${lobbyUuid}`
    return this.subscribeToChannel(channelName, callback)
  }

  /**
   * S'abonner aux événements d'une partie spécifique
   */
  async subscribeToGame(gameId: string, callback: (event: any) => void): Promise<() => void> {
    const channelName = `games/${gameId}`
    return this.subscribeToChannel(channelName, callback)
  }

  /**
   * S'abonner aux notifications d'un utilisateur
   */
  async subscribeToUserNotifications(
    userUuid: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    const channelName = `users/${userUuid}`
    return this.subscribeToChannel(channelName, callback)
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
