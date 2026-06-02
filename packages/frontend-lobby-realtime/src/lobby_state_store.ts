import type { LobbyData, LobbyDetailState, LobbyListState } from './lobby_types.js'

interface LobbyEventEnvelope {
  type: string
  data: any
  timestamp: string
  channel: string
}

export class LobbyStateStore {
  private lobbyListCallbacks = new Set<(state: LobbyListState) => void>()
  private lobbyDetailCallbacks = new Map<string, Set<(state: LobbyDetailState) => void>>()
  private lobbyDetailStates = new Map<string, LobbyDetailState>()

  private lobbyListState: LobbyListState = {
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  }

  subscribeLobbyList(callback: (state: LobbyListState) => void): () => void {
    this.lobbyListCallbacks.add(callback)
    callback(this.lobbyListState)

    return () => {
      this.lobbyListCallbacks.delete(callback)
    }
  }

  subscribeLobbyDetail(lobbyUuid: string, callback: (state: LobbyDetailState) => void): () => void {
    if (!this.lobbyDetailCallbacks.has(lobbyUuid)) {
      this.lobbyDetailCallbacks.set(lobbyUuid, new Set())
    }

    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)!
    callbacks.add(callback)

    const currentState = this.lobbyDetailStates.get(lobbyUuid) || {
      lobby: null,
      loading: false,
      error: null,
    }

    callback(currentState)

    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.lobbyDetailCallbacks.delete(lobbyUuid)
      }
    }
  }

  hasLobbyDetailSubscribers(lobbyUuid: string): boolean {
    return (this.lobbyDetailCallbacks.get(lobbyUuid)?.size || 0) > 0
  }

  setLobbyListLoading(loading: boolean): void {
    this.lobbyListState = { ...this.lobbyListState, loading }
    this.notifyLobbyListSubscribers()
  }

  setLobbyListError(error: string | null): void {
    this.lobbyListState = { ...this.lobbyListState, error }
    this.notifyLobbyListSubscribers()
  }

  setLobbyListData(lobbies: LobbyData[], total: number): void {
    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: Array.isArray(lobbies) ? lobbies : [],
      total,
      loading: false,
      error: null,
    }

    this.notifyLobbyListSubscribers()
  }

  setLobbyDetail(lobbyUuid: string, lobby: LobbyData | null, error: string | null = null): void {
    this.lobbyDetailStates.set(lobbyUuid, {
      lobby,
      loading: false,
      error,
    })

    this.notifyLobbyDetailSubscribers(lobbyUuid)
  }

  applyLobbyEvent(event: LobbyEventEnvelope): void {
    switch (event.type) {
      case 'lobby.created':
        this.handleLobbyCreated(event)
        break
      case 'lobby.deleted':
        this.handleLobbyDeleted(event)
        break
      case 'lobby.player.joined':
        this.handleLobbyPlayerJoined(event)
        break
      case 'lobby.player.left':
        this.handleLobbyPlayerLeft(event)
        break
      case 'lobby.status.changed':
        this.handleLobbyStatusChanged(event)
        break
      case 'lobby.owner.changed':
        this.handleLobbyOwnerChanged(event)
        break
      case 'lobby.updated':
        this.handleLobbyDetailUpdated(event)
        break
      case 'lobby.game.started':
        this.handleLobbyGameStarted(event)
        break
      default:
        break
    }
  }

  destroy(): void {
    this.lobbyListCallbacks.clear()
    this.lobbyDetailCallbacks.clear()
    this.lobbyDetailStates.clear()
  }

  private handleLobbyCreated(event: LobbyEventEnvelope): void {
    const newLobby = event.data?.lobby
    if (!newLobby) return

    const alreadyExists = this.lobbyListState.lobbies.some((lobby) => lobby.uuid === newLobby.uuid)
    if (alreadyExists) return

    const lobbies = [...this.lobbyListState.lobbies, this.withDerivedFlags(newLobby)]
    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies,
      total: lobbies.length,
    }

    this.notifyLobbyListSubscribers()
  }

  private handleLobbyDeleted(event: LobbyEventEnvelope): void {
    const lobbyUuid = event.data?.lobbyUuid
    if (!lobbyUuid) return

    const lobbies = this.lobbyListState.lobbies.filter((lobby) => lobby.uuid !== lobbyUuid)

    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies,
      total: lobbies.length,
    }

    this.notifyLobbyListSubscribers()
    this.updateLobbyDetail(lobbyUuid, () => null)
  }

  private handleLobbyPlayerJoined(event: LobbyEventEnvelope): void {
    this.applyPlayerChange(event, 'joined')
  }

  private handleLobbyPlayerLeft(event: LobbyEventEnvelope): void {
    this.applyPlayerChange(event, 'left')
  }

  private applyPlayerChange(event: LobbyEventEnvelope, changeType: 'joined' | 'left'): void {
    const eventData = event.data || {}
    const lobbyUuid = eventData.lobbyUuid || eventData.lobby?.uuid
    const player = eventData.player
    const playerCount = eventData.playerCount ?? eventData.lobby?.currentPlayers
    const updatedLobby = eventData.lobby

    if (!lobbyUuid) return

    if (updatedLobby) {
      this.updateLobbyInList(lobbyUuid, updatedLobby)
    } else if (playerCount !== undefined) {
      this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
    }

    this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
      if (updatedLobby) {
        const mergedLobby = currentLobby
          ? ({ ...currentLobby, ...updatedLobby } as LobbyData)
          : (updatedLobby as LobbyData)
        return this.withDerivedFlags(mergedLobby)
      }

      if (!currentLobby) {
        return currentLobby
      }

      const nextLobby: LobbyData = { ...currentLobby }

      if (playerCount !== undefined) {
        nextLobby.currentPlayers = playerCount
      }

      if (player && changeType === 'joined') {
        const alreadyInLobby = nextLobby.players.some((existingPlayer) => existingPlayer.uuid === player.uuid)
        if (!alreadyInLobby) {
          nextLobby.players = [...nextLobby.players, player]
        }
      }

      if (player && changeType === 'left') {
        nextLobby.players = nextLobby.players.filter((existingPlayer) => existingPlayer.uuid !== player.uuid)
      }

      return this.withDerivedFlags(nextLobby)
    })
  }

  private handleLobbyStatusChanged(event: LobbyEventEnvelope): void {
    const lobbyUuid = event.data?.lobbyUuid
    const status = event.data?.status || event.data?.newStatus

    if (!lobbyUuid || !status) return

    this.updateLobbyInList(lobbyUuid, { status })
    this.updateLobbyDetail(lobbyUuid, (lobby) => {
      if (!lobby) return lobby

      const updatedLobby: LobbyData = {
        ...lobby,
        status,
      }

      return this.withDerivedFlags(updatedLobby)
    })
  }

  private handleLobbyOwnerChanged(event: LobbyEventEnvelope): void {
    const lobbyUuid = event.data?.lobbyUuid
    const newOwnerUuid = event.data?.newOwnerUuid

    if (!lobbyUuid || !newOwnerUuid) return

    this.updateLobbyInList(lobbyUuid, { createdBy: newOwnerUuid })
    this.updateLobbyDetail(lobbyUuid, (lobby) => {
      if (!lobby) return lobby

      return this.withDerivedFlags({
        ...lobby,
        createdBy: newOwnerUuid,
      })
    })
  }

  private handleLobbyDetailUpdated(event: LobbyEventEnvelope): void {
    const updatedLobby = event.data?.lobby
    if (!updatedLobby) return

    this.updateLobbyInList(updatedLobby.uuid, updatedLobby)
    this.updateLobbyDetail(updatedLobby.uuid, () => this.withDerivedFlags(updatedLobby))
  }

  private handleLobbyGameStarted(event: LobbyEventEnvelope): void {
    const lobbyUuid = event.data?.lobbyUuid
    const lobby = event.data?.lobby
    const gameUuid = event.data?.gameUuid ?? event.data?.gameId

    if (!lobbyUuid) return

    this.updateLobbyInList(lobbyUuid, {
      status: 'IN_GAME',
      hasAvailableSlots: false,
      canStart: false,
      ...(gameUuid ? { gameUuid } : {}),
    })

    this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
      if (!currentLobby && lobby) {
        return {
          ...lobby,
          status: 'IN_GAME',
          hasAvailableSlots: false,
          canStart: false,
          ...(gameUuid ? { gameUuid } : {}),
        }
      }

      if (!currentLobby) return currentLobby

      return {
        ...currentLobby,
        status: 'IN_GAME',
        hasAvailableSlots: false,
        canStart: false,
        ...(gameUuid ? { gameUuid } : {}),
      }
    })
  }

  private updateLobbyInList(lobbyUuid: string, updates: Partial<LobbyData>): void {
    const index = this.lobbyListState.lobbies.findIndex((lobby) => lobby.uuid === lobbyUuid)
    if (index === -1) return

    const nextLobbies = [...this.lobbyListState.lobbies]
    const mergedLobby = { ...nextLobbies[index], ...updates } as LobbyData
    nextLobbies[index] = this.withDerivedFlags(mergedLobby)

    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: nextLobbies,
      total: nextLobbies.length,
    }

    this.notifyLobbyListSubscribers()
  }

  private updateLobbyDetail(lobbyUuid: string, updater: (lobby: LobbyData | null) => LobbyData | null): void {
    const currentState = this.lobbyDetailStates.get(lobbyUuid) || {
      lobby: null,
      loading: false,
      error: null,
    }

    const updatedLobby = updater(currentState.lobby)
    const nextState = {
      ...currentState,
      lobby: updatedLobby,
    }

    this.lobbyDetailStates.set(lobbyUuid, nextState)
    this.notifyLobbyDetailSubscribers(lobbyUuid)
  }

  private notifyLobbyListSubscribers(): void {
    this.lobbyListCallbacks.forEach((callback) => callback(this.lobbyListState))
  }

  private notifyLobbyDetailSubscribers(lobbyUuid: string): void {
    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)
    if (!callbacks || callbacks.size === 0) return

    const state = this.lobbyDetailStates.get(lobbyUuid) || {
      lobby: null,
      loading: false,
      error: null,
    }

    callbacks.forEach((callback) => callback(state))
  }

  private withDerivedFlags(lobby: LobbyData): LobbyData {
    const normalizedStatus = String(lobby.status || '').toUpperCase()
    const currentPlayers = Number.isFinite(lobby.currentPlayers) ? lobby.currentPlayers : 0
    const maxPlayers = Number.isFinite(lobby.maxPlayers) ? lobby.maxPlayers : 0

    return {
      ...lobby,
      currentPlayers,
      maxPlayers,
      hasAvailableSlots: currentPlayers < maxPlayers,
      canStart:
        currentPlayers >= 2 && maxPlayers >= 2 && normalizedStatus !== 'IN_GAME' && normalizedStatus !== 'STARTING',
    }
  }
}
