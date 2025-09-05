import { TransmitContextType } from '../contexts/TransmitContext'

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
 * Utilise Transmit pour les mises à jour temps réel
 */
export class LobbyService {
  private transmitContext: TransmitContextType
  private lobbyListSubscribers = new Set<(state: LobbyListState) => void>()
  private lobbyDetailSubscribers = new Map<string, Set<(state: any) => void>>()
  private globalUnsubscribe: (() => void) | null = null
  private lobbyListCallbacks = new Set<(state: LobbyListState) => void>()
  private lobbyDetailCallbacks = new Map<string, Set<(state: any) => void>>()

  // État interne pour la liste des lobbies
  private lobbyListState: LobbyListState = {
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  }

  constructor(transmitContext: TransmitContextType) {
    this.transmitContext = transmitContext
    this.setupTransmitListeners()
  }

  private async setupTransmitListeners() {
    try {
      // Éviter les souscriptions multiples
      if (this.globalUnsubscribe) {
        return
      }

      // S'abonner au canal global des lobbies pour recevoir les événements de création/suppression
      this.globalUnsubscribe = await this.transmitContext.subscribeToLobbies((event) => {
        console.log('Événement reçu sur canal lobbies:', event.type, event)
        switch (event.type) {
          case 'lobby.created':
            this.handleLobbyCreated({
              type: event.type,
              data: event,
              timestamp: event.timestamp,
              channel: 'lobbies',
            })
            break
          case 'lobby.deleted':
            this.handleLobbyDeleted({
              type: event.type,
              data: event,
              timestamp: event.timestamp,
              channel: 'lobbies',
            })
            break
          case 'lobby.player.joined':
          case 'lobby.player.left':
          case 'lobby.status.changed':
            // Ces événements mettent aussi à jour la liste globale
            console.log('Mise à jour liste lobby pour événement:', event.type)
            this.handleLobbyUpdated({
              type: 'lobby.list.updated',
              data: event,
              timestamp: event.timestamp,
              channel: 'lobbies',
            })
            // Également traiter l'événement pour les détails du lobby
            this.handleLobbyPlayerJoined(event)
            break
        }
      })
    } catch (error) {
      console.error('Erreur lors de la configuration des listeners Transmit:', error)
    }
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

  // Gestion des événements Transmit pour les détails de lobby
  private handleLobbyPlayerJoined(event: any) {
    const eventData = event.data
    const lobbyUuid = eventData.lobbyUuid || eventData.lobby?.uuid
    const player = eventData.player
    const playerCount = eventData.playerCount || eventData.lobby?.currentPlayers

    if (lobbyUuid && player) {
      this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      this.updateLobbyDetail(lobbyUuid, (lobby) => {
        if (lobby) {
          lobby.currentPlayers = playerCount
          // Éviter les doublons
          if (!lobby.players.find((p) => p.uuid === player.uuid)) {
            lobby.players.push(player)
          }
          lobby.hasAvailableSlots = lobby.currentPlayers < lobby.maxPlayers
        }
        return lobby
      })
    }
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
      return lobby
    })
  }

  private handleLobbyStatusChanged(event: any) {
    const { lobbyUuid, status } = event.data
    this.updateLobbyInList(lobbyUuid, { status })
    this.updateLobbyDetail(lobbyUuid, (lobby) => {
      if (lobby) {
        lobby.status = status
        // Recalculer les propriétés dérivées
        lobby.hasAvailableSlots =
          lobby.currentPlayers < lobby.maxPlayers && lobby.status === 'waiting'
        lobby.canStart = lobby.currentPlayers >= 2 && lobby.status === 'waiting'
      }
      return lobby
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
        const errorText = await response.text()
        console.error('Leave lobby error response:', errorText)
        throw new Error(`Failed to leave lobby: ${response.statusText}`)
      }

      // Vérifier si la réponse contient du JSON
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        // Si pas de JSON, retourner un objet de succès simple
        return { success: true, message: 'Successfully left lobby' }
      }
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
      // S'abonner au canal Transmit pour ce lobby
      this.transmitContext.subscribeToLobby(lobbyUuid, (event) => {
        // Convertir l'événement Transmit en format compatible
        const transmitEvent = {
          type: event.type,
          data: event.lobby || event,
          timestamp: event.timestamp || new Date().toISOString(),
          channel: `lobby:${lobbyUuid}`,
        }

        // Dispatcher vers les handlers appropriés
        switch (event.type) {
          case 'lobby.player.joined':
            this.handleLobbyPlayerJoined(transmitEvent)
            break
          case 'lobby.player.left':
            this.handleLobbyPlayerLeft(transmitEvent)
            break
          case 'lobby.status.changed':
            this.handleLobbyStatusChanged(transmitEvent)
            break
          case 'lobby.updated':
            this.handleLobbyDetailUpdated(transmitEvent)
            break
          case 'lobby.deleted':
            this.handleLobbyDeleted(transmitEvent)
            break
        }
      })
    }

    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)!
    callbacks.add(callback)

    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.lobbyDetailCallbacks.delete(lobbyUuid)
        // Se désabonner du canal Transmit
        this.transmitContext.unsubscribeFrom(`lobby:${lobbyUuid}`)
      }
    }
  }

  // Nettoyage
  destroy() {
    this.lobbyListCallbacks.clear()
    this.lobbyDetailCallbacks.clear()
  }
}
