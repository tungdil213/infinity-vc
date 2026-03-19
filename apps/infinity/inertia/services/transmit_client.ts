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
      // Add authentication headers when needed
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        if (!request.headers) {
          request.headers = {}
        }
        ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
      }
    },
    beforeUnsubscribe: (request: RequestInit) => {
      // Add authentication headers when needed
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        if (!request.headers) {
          request.headers = {}
        }
        ;(request.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken
      }
    },
    onReconnectAttempt: (attempt) => {
      console.log(`Transmit reconnect attempt #${attempt}`)
    },
    onReconnectFailed: () => {
      console.error('Transmit reconnect failed')
    },
    onSubscribeFailed: (response) => {
      console.error('Transmit subscription failed:', response)
    },
    onSubscription: (channel) => {
      console.log(`Transmit subscribed to channel: ${channel}`)
    },
    onUnsubscription: (channel) => {
      console.log(`Transmit unsubscribed from channel: ${channel}`)
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
 * Lobby event shape received through Transmit
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
 * Lobby event subscription service based on Transmit
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

      throw new Error(`Failed to subscribe to Transmit channel: ${channelName}`)
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
   * Subscribe to global lobby events
   */
  async subscribeToLobbies(callback: (event: LobbyTransmitEvent) => void): Promise<() => void> {
    return this.subscribeToChannel('lobbies', callback)
  }

  /**
   * Subscribe to events for a specific lobby
   */
  async subscribeToLobby(
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ): Promise<() => void> {
    const channelName = `lobbies/${lobbyUuid}`
    return this.subscribeToChannel(channelName, callback)
  }

  /**
   * Subscribe to events for a specific game
   */
  async subscribeToGame(gameId: string, callback: (event: any) => void): Promise<() => void> {
    const channelName = `games/${gameId}`
    return this.subscribeToChannel(channelName, callback)
  }

  /**
   * Subscribe to notifications for a specific user
   */
  async subscribeToUserNotifications(
    userUuid: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    const channelName = `users/${userUuid}`
    return this.subscribeToChannel(channelName, callback)
  }

  /**
   * Unsubscribe from a specific channel
   */
  async unsubscribeFrom(channelName: string): Promise<void> {
    const subscription = this.subscriptions.get(channelName)
    if (subscription) {
      await subscription.delete()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.values()).map((subscription) =>
      subscription.delete()
    )
    await Promise.all(promises)
    this.subscriptions.clear()
  }

  /**
   * Return active subscription channel names
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// Global client instance
export const transmitLobbyClient = new TransmitLobbyClient()
