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

export class LobbyRealtimeSync {
  private transmitContext: RealtimeTransmitContext
  private handlers: LobbyRealtimeSyncHandlers

  private isGloballySubscribed = false
  private globalUnsubscribe: (() => void) | null = null

  private lobbyUnsubscribes = new Map<string, () => void>()
  private pendingLobbySubscriptions = new Set<string>()
  private cancelledLobbySubscriptions = new Set<string>()
  private requestedLobbySubscriptions = new Set<string>()

  constructor(transmitContext: RealtimeTransmitContext, handlers: LobbyRealtimeSyncHandlers) {
    this.transmitContext = transmitContext
    this.handlers = handlers

    this.setupGlobalSubscription()
  }

  updateContext(transmitContext: RealtimeTransmitContext): void {
    this.transmitContext = transmitContext

    if (!this.isGloballySubscribed) {
      this.setupGlobalSubscription()
    }

    if (this.transmitContext.isConnected) {
      this.requestedLobbySubscriptions.forEach((lobbyUuid) => {
        if (!this.lobbyUnsubscribes.has(lobbyUuid)) {
          this.createLobbySubscription(lobbyUuid)
        }
      })
    }
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
    } catch (error) {
      this.isGloballySubscribed = false
      console.error('LobbyRealtimeSync: failed to setup global subscription', error)
    }
  }

  private createLobbySubscription(lobbyUuid: string): void {
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
      })
      .catch((error: unknown) => {
        this.pendingLobbySubscriptions.delete(lobbyUuid)
        this.cancelledLobbySubscriptions.delete(lobbyUuid)
        console.error('LobbyRealtimeSync: failed to subscribe to lobby channel', {
          lobbyUuid,
          error,
        })
      })
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
