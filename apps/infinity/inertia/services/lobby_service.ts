import type { TransmitContextType } from '../contexts/TransmitContext'
import { LobbyApiClient } from './lobby_api_client'
import { LobbyRealtimeSync } from './lobby_realtime_sync'
import { LobbyStateStore } from './lobby_state_store'
import type {
  CreateLobbyPayload,
  LobbyData,
  LobbyDetailState,
  LobbyFilters,
  LobbyListState,
} from './lobby_types'

export type {
  CreateLobbyPayload,
  LobbyData,
  LobbyDetailState,
  LobbyFilters,
  LobbyListState,
} from './lobby_types'

/**
 * Facade orchestrating HTTP API calls, Transmit realtime sync, and local lobby state.
 */
export class LobbyService {
  private readonly apiClient: LobbyApiClient
  private readonly stateStore: LobbyStateStore
  private readonly realtimeSync: LobbyRealtimeSync

  constructor(transmitContext: TransmitContextType) {
    this.apiClient = new LobbyApiClient()
    this.stateStore = new LobbyStateStore()
    this.realtimeSync = new LobbyRealtimeSync(transmitContext, {
      onGlobalLobbyEvent: (event) => this.stateStore.applyLobbyEvent(event),
      onLobbyDetailEvent: (event) => this.stateStore.applyLobbyEvent(event),
    })
  }

  updateContext(transmitContext: TransmitContextType): void {
    this.realtimeSync.updateContext(transmitContext)
  }

  async fetchLobbies(filters?: LobbyFilters): Promise<void> {
    this.stateStore.setLobbyListLoading(true)
    this.stateStore.setLobbyListError(null)

    try {
      const result = await this.apiClient.fetchLobbies(filters)
      this.stateStore.setLobbyListData(result.lobbies, result.total)
    } catch (error) {
      this.stateStore.setLobbyListError(error instanceof Error ? error.message : 'Unknown error')
      this.stateStore.setLobbyListLoading(false)
    }
  }

  async fetchLobbyDetails(lobbyUuid: string): Promise<LobbyData | null> {
    try {
      const lobby = await this.apiClient.fetchLobbyDetails(lobbyUuid)
      this.stateStore.setLobbyDetail(lobbyUuid, lobby)
      return lobby
    } catch (error) {
      this.stateStore.setLobbyDetail(
        lobbyUuid,
        null,
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }

  async createLobby(lobbyData: CreateLobbyPayload): Promise<unknown> {
    return this.apiClient.createLobby(lobbyData)
  }

  async joinLobby(lobbyUuid: string, userUuid: string): Promise<unknown> {
    return this.apiClient.joinLobby(lobbyUuid, userUuid)
  }

  async leaveLobby(lobbyUuid: string, userUuid: string): Promise<unknown> {
    return this.apiClient.leaveLobby(lobbyUuid, userUuid)
  }

  async startGame(lobbyUuid: string, userUuid: string): Promise<unknown> {
    return this.apiClient.startGame(lobbyUuid, userUuid)
  }

  subscribeLobbyList(callback: (state: LobbyListState) => void): () => void {
    return this.stateStore.subscribeLobbyList(callback)
  }

  subscribeLobbyDetail(lobbyUuid: string, callback: (state: LobbyDetailState) => void): () => void {
    const unsubscribeStore = this.stateStore.subscribeLobbyDetail(lobbyUuid, callback)
    this.realtimeSync.subscribeLobbyDetail(lobbyUuid)

    return () => {
      unsubscribeStore()

      if (!this.stateStore.hasLobbyDetailSubscribers(lobbyUuid)) {
        this.realtimeSync.unsubscribeLobbyDetail(lobbyUuid)
      }
    }
  }

  destroy(): void {
    this.realtimeSync.destroy()
    this.stateStore.destroy()
  }
}
