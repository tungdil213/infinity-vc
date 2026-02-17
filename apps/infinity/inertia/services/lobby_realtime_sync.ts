import type { TransmitContextType } from '../contexts/TransmitContext'
import type { LobbyTransmitEvent } from './transmit_client'

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
  private transmitContext: TransmitContextType
  private handlers: LobbyRealtimeSyncHandlers

  private isGloballySubscribed = false
  private globalUnsubscribe: (() => void) | null = null

  private lobbyUnsubscribes = new Map<string, () => void>()
  private requestedLobbySubscriptions = new Set<string>()

  constructor(transmitContext: TransmitContextType, handlers: LobbyRealtimeSyncHandlers) {
    this.transmitContext = transmitContext
    this.handlers = handlers

    this.setupGlobalSubscription()
  }

  updateContext(transmitContext: TransmitContextType): void {
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

    if (!this.transmitContext.isConnected || this.lobbyUnsubscribes.has(lobbyUuid)) {
      return
    }

    this.createLobbySubscription(lobbyUuid)
  }

  unsubscribeLobbyDetail(lobbyUuid: string): void {
    this.requestedLobbySubscriptions.delete(lobbyUuid)

    const unsubscribe = this.lobbyUnsubscribes.get(lobbyUuid)
    if (unsubscribe) {
      unsubscribe()
      this.lobbyUnsubscribes.delete(lobbyUuid)
      return
    }

    this.transmitContext.unsubscribeFrom(`lobbies/${lobbyUuid}`).catch((error) => {
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
    this.transmitContext
      .subscribeToLobby(lobbyUuid, (event: LobbyTransmitEvent) => {
        this.handlers.onLobbyDetailEvent(this.wrapEvent(event, `lobbies/${lobbyUuid}`))
      })
      .then((unsubscribe) => {
        this.lobbyUnsubscribes.set(lobbyUuid, unsubscribe)
      })
      .catch((error) => {
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
