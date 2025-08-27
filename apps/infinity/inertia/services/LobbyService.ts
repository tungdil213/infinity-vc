import { useSSEContext } from '../contexts/SSEContext'

export interface LobbyData {
  uuid: string
  name: string
  status: string
  currentPlayers: number
  maxPlayers: number
  isPrivate: boolean
  hasAvailableSlots: boolean
  canStart: boolean
  createdBy: string
  players: Array<{
    uuid: string
    nickName: string
  }>
  createdAt: string
}

export interface LobbyListState {
  lobbies: LobbyData[]
  loading: boolean
  error: string | null
  total: number
}

export interface LobbyDetailState {
  lobby: LobbyData | null
  loading: boolean
  error: string | null
}

/**
 * Service pour gérer l'état des lobbies côté front-end
 * Utilise SSE pour les mises à jour temps réel
 */
export class LobbyService {
  private sseContext: ReturnType<typeof useSSEContext>
  private lobbyListCallbacks: Set<(state: LobbyListState) => void> = new Set()
  private lobbyDetailCallbacks: Map<string, Set<(state: LobbyDetailState) => void>> = new Map()

  private lobbyListState: LobbyListState = {
    lobbies: [],
    loading: false,
    error: null,
    total: 0,
  }

  constructor(sseContext: ReturnType<typeof useSSEContext>) {
    this.sseContext = sseContext
    this.setupSSEListeners()
  }

  private setupSSEListeners() {
    // Écouter les événements de liste de lobbies
    this.sseContext.addEventListener('lobby.created', this.handleLobbyCreated.bind(this))
    this.sseContext.addEventListener('lobby.list.updated', this.handleLobbyUpdated.bind(this))
    this.sseContext.addEventListener('lobby.list.removed', this.handleLobbyRemoved.bind(this))
    this.sseContext.addEventListener('lobby.list.full', this.handleLobbyListFull.bind(this))

    // Écouter les événements spécifiques aux lobbies
    this.sseContext.addEventListener('lobby.player.joined', this.handleLobbyPlayerJoined.bind(this))
    this.sseContext.addEventListener('lobby.player.left', this.handleLobbyPlayerLeft.bind(this))
    this.sseContext.addEventListener('lobby.updated', this.handleLobbyDetailUpdated.bind(this))
    this.sseContext.addEventListener('lobby.deleted', this.handleLobbyDeleted.bind(this))
  }

  // Gestion des événements SSE pour la liste des lobbies
  private handleLobbyCreated(event: any) {
    const newLobby = event.data.lobby
    this.lobbyListState.lobbies.push(newLobby)
    this.lobbyListState.total = this.lobbyListState.lobbies.length
    this.notifyLobbyListSubscribers()
  }

  private handleLobbyUpdated(event: any) {
    const updatedLobby = event.data.lobby
    const index = this.lobbyListState.lobbies.findIndex((l) => l.uuid === updatedLobby.uuid)
    if (index !== -1) {
      this.lobbyListState.lobbies[index] = updatedLobby
      this.notifyLobbyListSubscribers()
    }
  }

  private handleLobbyRemoved(event: any) {
    const lobbyUuid = event.data.lobbyUuid
    this.lobbyListState.lobbies = this.lobbyListState.lobbies.filter((l) => l.uuid !== lobbyUuid)
    this.lobbyListState.total = this.lobbyListState.lobbies.length
    this.notifyLobbyListSubscribers()
  }

  private handleLobbyListFull(event: any) {
    this.lobbyListState.lobbies = event.data.lobbies
    this.lobbyListState.total = event.data.total
    this.lobbyListState.loading = false
    this.notifyLobbyListSubscribers()
  }

  // Gestion des événements SSE pour les détails de lobby
  private handleLobbyPlayerJoined(event: any) {
    const { lobbyUuid, player, playerCount } = event.data
    this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
    this.updateLobbyDetail(lobbyUuid, (lobby) => {
      if (lobby) {
        lobby.currentPlayers = playerCount
        lobby.players.push(player)
        lobby.hasAvailableSlots = lobby.currentPlayers < lobby.maxPlayers
      }
    })
  }

  private handleLobbyPlayerLeft(event: any) {
    const { lobbyUuid, player, playerCount } = event.data
    this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
    this.updateLobbyDetail(lobbyUuid, (lobby) => {
      if (lobby) {
        lobby.currentPlayers = playerCount
        lobby.players = lobby.players.filter((p) => p.uuid !== player.uuid)
        lobby.hasAvailableSlots = lobby.currentPlayers < lobby.maxPlayers
      }
    })
  }

  private handleLobbyDetailUpdated(event: any) {
    const updatedLobby = event.data.lobby
    this.updateLobbyInList(updatedLobby.uuid, updatedLobby)
    this.updateLobbyDetail(updatedLobby.uuid, () => updatedLobby)
  }

  private handleLobbyDeleted(event: any) {
    const lobbyUuid = event.data.lobbyUuid
    this.handleLobbyRemoved(event)
    this.updateLobbyDetail(lobbyUuid, () => null)
  }

  // Méthodes utilitaires
  private updateLobbyInList(lobbyUuid: string, updates: Partial<LobbyData>) {
    const index = this.lobbyListState.lobbies.findIndex((l) => l.uuid === lobbyUuid)
    if (index !== -1) {
      this.lobbyListState.lobbies[index] = { ...this.lobbyListState.lobbies[index], ...updates }
      this.notifyLobbyListSubscribers()
    }
  }

  private updateLobbyDetail(
    lobbyUuid: string,
    updater: (lobby: LobbyData | null) => LobbyData | null
  ) {
    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)
    if (callbacks && callbacks.size > 0) {
      // Il y a des abonnés pour ce lobby, mettre à jour
      const currentState = { lobby: null, loading: false, error: null } // Récupérer l'état actuel
      const updatedLobby = updater(currentState.lobby)
      const newState = { ...currentState, lobby: updatedLobby }
      callbacks.forEach((callback) => callback(newState))
    }
  }

  private notifyLobbyListSubscribers() {
    this.lobbyListCallbacks.forEach((callback) => callback(this.lobbyListState))
  }

  // API publique
  async fetchLobbies(filters?: { status?: string; hasSlots?: boolean; includePrivate?: boolean }) {
    this.lobbyListState.loading = true
    this.lobbyListState.error = null
    this.notifyLobbyListSubscribers()

    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.hasSlots !== undefined) params.append('hasSlots', filters.hasSlots.toString())
      if (filters?.includePrivate !== undefined)
        params.append('includePrivate', filters.includePrivate.toString())

      const response = await fetch(`/api/v1/lobbies?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch lobbies: ${response.statusText}`)
      }

      const data = await response.json()
      this.lobbyListState.lobbies = data.data
      this.lobbyListState.total = data.meta.total
      this.lobbyListState.loading = false
      this.notifyLobbyListSubscribers()
    } catch (error) {
      this.lobbyListState.error = error instanceof Error ? error.message : 'Unknown error'
      this.lobbyListState.loading = false
      this.notifyLobbyListSubscribers()
    }
  }

  async fetchLobbyDetails(lobbyUuid: string): Promise<LobbyData | null> {
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch lobby: ${response.statusText}`)
      }

      const data = await response.json()
      return data.lobby
    } catch (error) {
      console.error('Error fetching lobby details:', error)
      return null
    }
  }

  async createLobby(lobbyData: {
    name: string
    maxPlayers?: number
    isPrivate?: boolean
    userUuid: string
  }) {
    try {
      const response = await fetch('/api/v1/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(lobbyData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create lobby: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating lobby:', error)
      throw error
    }
  }

  async joinLobby(lobbyUuid: string, userUuid: string) {
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userUuid }),
      })

      if (!response.ok) {
        throw new Error(`Failed to join lobby: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error joining lobby:', error)
      throw error
    }
  }

  async leaveLobby(lobbyUuid: string, userUuid: string) {
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userUuid }),
      })

      if (!response.ok) {
        throw new Error(`Failed to leave lobby: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error leaving lobby:', error)
      throw error
    }
  }

  async startGame(lobbyUuid: string, userUuid: string) {
    try {
      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userUuid }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start game: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error starting game:', error)
      throw error
    }
  }

  // Abonnements
  subscribeLobbyList(callback: (state: LobbyListState) => void) {
    this.lobbyListCallbacks.add(callback)
    // Envoyer l'état actuel immédiatement
    callback(this.lobbyListState)

    return () => {
      this.lobbyListCallbacks.delete(callback)
    }
  }

  subscribeLobbyDetail(lobbyUuid: string, callback: (state: LobbyDetailState) => void) {
    if (!this.lobbyDetailCallbacks.has(lobbyUuid)) {
      this.lobbyDetailCallbacks.set(lobbyUuid, new Set())
      // S'abonner au canal SSE pour ce lobby
      this.sseContext.subscribeToChannel(`lobby:${lobbyUuid}`)
    }

    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)!
    callbacks.add(callback)

    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.lobbyDetailCallbacks.delete(lobbyUuid)
        // Se désabonner du canal SSE
        this.sseContext.unsubscribeFromChannel(`lobby:${lobbyUuid}`)
      }
    }
  }

  // Nettoyage
  destroy() {
    this.lobbyListCallbacks.clear()
    this.lobbyDetailCallbacks.clear()
  }
}
