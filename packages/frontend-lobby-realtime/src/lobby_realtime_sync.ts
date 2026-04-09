import type { LobbyTransmitEvent } from './transmit_client.js'

interface RealtimeTransmitContext {
  isConnected: boolean
  subscribeToLobbies: (callback: (event: LobbyTransmitEvent) => void) => Promise<() => void>
  subscribeToLobby: (
    lobbyUuid: string,
    callback: (event: LobbyTransmitEvent) => void
  ) => Promise<() => void>
  unsubscribeFrom: (channelName: string) => Promise<void>
}

interface LobbyEventEnvelope {
  type: string
  data: any
  timestamp: string
  channel: string
}

interface LobbyRealtimeSyncHandlers {
  onGlobalLobbyEvent: (event: LobbyEventEnvelope) => void
  onLobbyDetailEvent: (event: LobbyEventEnvelope) => void
}

interface LobbyRealtimeSyncOptions {
  retryDelayMs?: number
}

export class LobbyRealtimeSync {
  private transmitContext: RealtimeTransmitContext
  private handlers: LobbyRealtimeSyncHandlers
  private readonly retryDelayMs: number

  private isGloballySubscribed = false
  private globalUnsubscribe: (() => void) | null = null
  private globalRetryTimeout: ReturnType<typeof setTimeout> | null = null

  private lobbyUnsubscribes = new Map<string, () => void>()
  private pendingLobbySubscriptions = new Set<string>()
  private cancelledLobbySubscriptions = new Set<string>()
  private requestedLobbySubscriptions = new Set<string>()
  private lobbyRetryTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    transmitContext: RealtimeTransmitContext,
    handlers: LobbyRealtimeSyncHandlers,
    options: LobbyRealtimeSyncOptions = {}
  ) {
    this.transmitContext = transmitContext
    this.handlers = handlers
    this.retryDelayMs = options.retryDelayMs ?? 1500

    void this.setupGlobalSubscription()
  }

  updateContext(transmitContext: RealtimeTransmitContext): void {
    this.transmitContext = transmitContext

    if (!this.transmitContext.isConnected) {
      this.clearGlobalRetry()
      this.clearAllLobbyRetries()
      return
    }

    if (!this.isGloballySubscribed) {
      void this.setupGlobalSubscription()
    }

    this.requestedLobbySubscriptions.forEach((lobbyUuid) => {
      if (
        !this.lobbyUnsubscribes.has(lobbyUuid) &&
        !this.pendingLobbySubscriptions.has(lobbyUuid)
      ) {
        this.createLobbySubscription(lobbyUuid)
      }
    })
  }

  subscribeLobbyDetail(lobbyUuid: string): void {
    this.requestedLobbySubscriptions.add(lobbyUuid)

    if (
      !this.transmitContext.isConnected ||
      this.lobbyUnsubscribes.has(lobbyUuid) ||
      this.pendingLobbySubscriptions.has(lobbyUuid)
    ) {
      return
    }

    this.createLobbySubscription(lobbyUuid)
  }

  unsubscribeLobbyDetail(lobbyUuid: string): void {
    this.requestedLobbySubscriptions.delete(lobbyUuid)
    this.cancelledLobbySubscriptions.add(lobbyUuid)
    this.clearLobbyRetry(lobbyUuid)

    const unsubscribe = this.lobbyUnsubscribes.get(lobbyUuid)
    if (unsubscribe) {
      unsubscribe()
      this.lobbyUnsubscribes.delete(lobbyUuid)
      return
    }

    this.transmitContext.unsubscribeFrom(`lobbies/${lobbyUuid}`).catch((error: unknown) => {
      console.error('LobbyRealtimeSync: failed to unsubscribe from lobby channel', error)
    })
  }

  destroy(): void {
    this.clearGlobalRetry()
    this.clearAllLobbyRetries()

    if (this.globalUnsubscribe) {
      this.globalUnsubscribe()
      this.globalUnsubscribe = null
    }

    this.lobbyUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.lobbyUnsubscribes.clear()
    this.pendingLobbySubscriptions.clear()
    this.cancelledLobbySubscriptions.clear()
    this.requestedLobbySubscriptions.clear()
    this.isGloballySubscribed = false
  }

  private async setupGlobalSubscription(): Promise<void> {
    if (this.isGloballySubscribed || !this.transmitContext.isConnected) {
      return
    }

    try {
      this.globalUnsubscribe = await this.transmitContext.subscribeToLobbies(
        (event: LobbyTransmitEvent) => {
          this.handlers.onGlobalLobbyEvent(this.wrapEvent(event, 'lobbies'))
        }
      )

      this.isGloballySubscribed = true
      this.clearGlobalRetry()
    } catch (error) {
      this.isGloballySubscribed = false
      console.error('LobbyRealtimeSync: failed to setup global subscription', error)
      this.scheduleGlobalRetry()
    }
  }

  private createLobbySubscription(lobbyUuid: string): void {
    this.clearLobbyRetry(lobbyUuid)
    this.pendingLobbySubscriptions.add(lobbyUuid)

    this.transmitContext
      .subscribeToLobby(lobbyUuid, (event: LobbyTransmitEvent) => {
        this.handlers.onLobbyDetailEvent(this.wrapEvent(event, `lobbies/${lobbyUuid}`))
      })
      .then((unsubscribe: () => void) => {
        this.pendingLobbySubscriptions.delete(lobbyUuid)

        const shouldKeepSubscription =
          this.requestedLobbySubscriptions.has(lobbyUuid) &&
          !this.cancelledLobbySubscriptions.has(lobbyUuid)

        if (!shouldKeepSubscription) {
          unsubscribe()
          this.cancelledLobbySubscriptions.delete(lobbyUuid)
          return
        }

        this.cancelledLobbySubscriptions.delete(lobbyUuid)
        this.lobbyUnsubscribes.set(lobbyUuid, unsubscribe)
        this.clearLobbyRetry(lobbyUuid)
      })
      .catch((error: unknown) => {
        this.pendingLobbySubscriptions.delete(lobbyUuid)
        this.cancelledLobbySubscriptions.delete(lobbyUuid)
        console.error('LobbyRealtimeSync: failed to subscribe to lobby channel', {
          lobbyUuid,
          error,
        })
        this.scheduleLobbyRetry(lobbyUuid)
      })
  }

  private scheduleGlobalRetry(): void {
    if (this.globalRetryTimeout || this.isGloballySubscribed || !this.transmitContext.isConnected) {
      return
    }

    this.globalRetryTimeout = setTimeout(() => {
      this.globalRetryTimeout = null
      void this.setupGlobalSubscription()
    }, this.retryDelayMs)
  }

  private clearGlobalRetry(): void {
    if (!this.globalRetryTimeout) {
      return
    }

    clearTimeout(this.globalRetryTimeout)
    this.globalRetryTimeout = null
  }

  private scheduleLobbyRetry(lobbyUuid: string): void {
    if (
      this.lobbyRetryTimeouts.has(lobbyUuid) ||
      !this.requestedLobbySubscriptions.has(lobbyUuid) ||
      this.pendingLobbySubscriptions.has(lobbyUuid) ||
      this.lobbyUnsubscribes.has(lobbyUuid) ||
      !this.transmitContext.isConnected
    ) {
      return
    }

    const retryTimeout = setTimeout(() => {
      this.lobbyRetryTimeouts.delete(lobbyUuid)

      if (
        !this.requestedLobbySubscriptions.has(lobbyUuid) ||
        this.pendingLobbySubscriptions.has(lobbyUuid) ||
        this.lobbyUnsubscribes.has(lobbyUuid) ||
        !this.transmitContext.isConnected
      ) {
        return
      }

      this.createLobbySubscription(lobbyUuid)
    }, this.retryDelayMs)

    this.lobbyRetryTimeouts.set(lobbyUuid, retryTimeout)
  }

  private clearLobbyRetry(lobbyUuid: string): void {
    const retryTimeout = this.lobbyRetryTimeouts.get(lobbyUuid)

    if (!retryTimeout) {
      return
    }

    clearTimeout(retryTimeout)
    this.lobbyRetryTimeouts.delete(lobbyUuid)
  }

  private clearAllLobbyRetries(): void {
    this.lobbyRetryTimeouts.forEach((timeout) => clearTimeout(timeout))
    this.lobbyRetryTimeouts.clear()
  }

  private wrapEvent(event: LobbyTransmitEvent, channel: string): LobbyEventEnvelope {
    return {
      type: event.type,
      data: event,
      timestamp: event.timestamp || new Date().toISOString(),
      channel,
    }
  }
}
