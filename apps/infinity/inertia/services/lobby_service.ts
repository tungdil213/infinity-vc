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
  private lobbyDetailStates = new Map<string, LobbyDetailState>()

  // État interne pour la liste des lobbies
  private lobbyListState: LobbyListState = {
    lobbies: [],
    loading: true,
    error: null,
    total: 0,
  }

  private isSubscribed = false

  constructor(transmitContext: TransmitContextType) {
    this.transmitContext = transmitContext
    this.setupTransmitListeners()
  }

  /**
   * Réinitialise les listeners avec un nouveau contexte (utile après reconnexion)
   */
  updateContext(transmitContext: TransmitContextType) {
    this.transmitContext = transmitContext
    // Si pas encore abonné, réessayer
    if (!this.isSubscribed) {
      console.log('LobbyService: Mise à jour du contexte et retry de souscription')
      this.setupTransmitListeners()
    }
  }

  private async setupTransmitListeners() {
    try {
      // Éviter les souscriptions multiples
      if (this.isSubscribed) {
        console.log('Listeners Transmit déjà configurés, éviter les doublons')
        return
      }

      // Vérifier que le contexte est connecté
      if (!this.transmitContext.isConnected) {
        console.log('LobbyService: En attente de connexion Transmit pour souscription')
        return
      }

      console.log('Configuration des listeners Transmit pour le canal lobbies')
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
      this.isSubscribed = true
      console.log('Listeners Transmit configurés avec succès')
    } catch (error) {
      console.error('Erreur lors de la configuration des listeners Transmit:', error)
      this.isSubscribed = false
    }
  }

  // Gestion des événements SSE pour la liste des lobbies
  private handleLobbyCreated(event: any) {
    console.log('handleLobbyCreated - event reçu:', event)
    // L'événement contient directement les données du lobby dans event.data.lobby
    const newLobby = event.data.lobby
    console.log('handleLobbyCreated - nouveau lobby:', newLobby)

    if (newLobby) {
      // Vérifier si le lobby n'existe pas déjà
      const existingIndex = this.lobbyListState.lobbies.findIndex((l) => l.uuid === newLobby.uuid)
      if (existingIndex === -1) {
        // Créer un nouvel array au lieu de muter l'existant pour déclencher React
        this.lobbyListState = {
          ...this.lobbyListState,
          lobbies: [...this.lobbyListState.lobbies, newLobby],
          total: this.lobbyListState.lobbies.length + 1,
        }
        console.log('handleLobbyCreated - lobby ajouté, total:', this.lobbyListState.total)
        this.notifyLobbyListSubscribers()
      } else {
        console.log('handleLobbyCreated - lobby existe déjà, ignoré')
      }
    } else {
      console.error('handleLobbyCreated - pas de données lobby trouvées dans:', event)
    }
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
    const updatedLobby = eventData.lobby

    console.log('handleLobbyPlayerJoined - données:', {
      lobbyUuid,
      player,
      playerCount,
      updatedLobby,
    })

    if (lobbyUuid) {
      // Mettre à jour la liste globale
      if (playerCount !== undefined) {
        this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      }

      // Mettre à jour les détails du lobby
      this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
        // Si on a le lobby complet dans l'événement, l'utiliser même si currentLobby est null
        if (updatedLobby) {
          return currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
        }

        // Si pas de lobby complet et pas de currentLobby, on ne peut pas faire de mise à jour partielle
        if (!currentLobby) return currentLobby

        // Sinon, mise à jour partielle
        const updatedCurrentLobby = { ...currentLobby }

        if (playerCount !== undefined) {
          updatedCurrentLobby.currentPlayers = playerCount
        }

        if (player && !updatedCurrentLobby.players.find((p) => p.uuid === player.uuid)) {
          updatedCurrentLobby.players = [...updatedCurrentLobby.players, player]
        }

        updatedCurrentLobby.hasAvailableSlots =
          updatedCurrentLobby.currentPlayers < updatedCurrentLobby.maxPlayers

        return updatedCurrentLobby
      })
    }
  }

  private handleLobbyPlayerLeft(event: any) {
    const eventData = event.data
    const lobbyUuid = eventData.lobbyUuid || eventData.lobby?.uuid
    const player = eventData.player
    const playerCount = eventData.playerCount || eventData.lobby?.currentPlayers
    const updatedLobby = eventData.lobby

    console.log('handleLobbyPlayerLeft - données:', {
      lobbyUuid,
      player,
      playerCount,
      updatedLobby,
    })

    if (lobbyUuid) {
      // Mettre à jour la liste globale
      if (playerCount !== undefined) {
        this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      }

      // Mettre à jour les détails du lobby
      this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
        // Si on a le lobby complet dans l'événement, l'utiliser même si currentLobby est null
        if (updatedLobby) {
          return currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
        }

        // Si pas de lobby complet et pas de currentLobby, on ne peut pas faire de mise à jour partielle
        if (!currentLobby) return currentLobby

        // Sinon, mise à jour partielle
        const updatedCurrentLobby = { ...currentLobby }

        if (playerCount !== undefined) {
          updatedCurrentLobby.currentPlayers = playerCount
        }

        if (player) {
          updatedCurrentLobby.players = updatedCurrentLobby.players.filter(
            (p) => p.uuid !== player.uuid
          )
        }

        updatedCurrentLobby.hasAvailableSlots =
          updatedCurrentLobby.currentPlayers < updatedCurrentLobby.maxPlayers

        return updatedCurrentLobby
      })
    }
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
    console.log('handleLobbyDeleted - event reçu:', event)
    const lobbyUuid = event.data.lobbyUuid
    console.log('handleLobbyDeleted - suppression lobby:', lobbyUuid)

    // Supprimer le lobby de la liste avec immutabilité
    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: this.lobbyListState.lobbies.filter((l) => l.uuid !== lobbyUuid),
      total: this.lobbyListState.lobbies.length - 1,
    }

    console.log('handleLobbyDeleted - nouveau total:', this.lobbyListState.total)
    this.notifyLobbyListSubscribers()
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
      console.log(`Mise à jour des détails du lobby ${lobbyUuid} pour ${callbacks.size} abonnés`)

      // Utiliser un état par défaut si pas d'état actuel
      const currentState = this.lobbyDetailStates.get(lobbyUuid) || {
        lobby: null,
        loading: false,
        error: null,
      }
      const updatedLobby = updater(currentState.lobby)
      const newState = { ...currentState, lobby: updatedLobby }

      // Sauvegarder l'état
      this.lobbyDetailStates.set(lobbyUuid, newState)

      // Notifier tous les abonnés
      callbacks.forEach((callback) => {
        console.log("Notification d'un abonné pour le lobby", lobbyUuid)
        callback(newState)
      })
    } else {
      console.log(`Aucun abonné pour le lobby ${lobbyUuid}, pas de mise à jour`)
    }
  }

  private notifyLobbyListSubscribers() {
    console.log('notifyLobbyListSubscribers - nombre de callbacks:', this.lobbyListCallbacks.size)
    console.log('notifyLobbyListSubscribers - état actuel:', this.lobbyListState)
    this.lobbyListCallbacks.forEach((callback) => {
      console.log('notifyLobbyListSubscribers - appel callback')
      callback(this.lobbyListState)
    })
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
    console.log(`LobbyService: Récupération des détails du lobby ${lobbyUuid}`)
    try {
      const url = `/api/v1/lobbies/${lobbyUuid}`
      console.log(`LobbyService: Appel API vers ${url}`)

      const response = await fetch(url, {
        credentials: 'include',
      })

      console.log(`LobbyService: Réponse API status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`LobbyService: Erreur API ${response.status}: ${errorText}`)
        throw new Error(`Failed to fetch lobby: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("LobbyService: Données reçues de l'API:", data)

      // Vérifier la structure de la réponse
      if (data.lobby) {
        console.log('LobbyService: Lobby trouvé:', data.lobby)
        return data.lobby
      } else if (data.data) {
        console.log('LobbyService: Lobby trouvé dans data:', data.data)
        return data.data
      } else {
        console.log('LobbyService: Structure de réponse inattendue:', data)
        return data
      }
    } catch (error) {
      console.error('LobbyService: Erreur lors de la récupération des détails:', error)
      throw error
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
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/join`, {
        method: 'POST',
        headers,
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
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const response = await fetch(`/api/v1/lobbies/${lobbyUuid}/leave`, {
        method: 'POST',
        headers,
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
    console.log(
      'subscribeLobbyList - ajout callback, total callbacks:',
      this.lobbyListCallbacks.size + 1
    )
    this.lobbyListCallbacks.add(callback)
    // Envoyer l'état actuel immédiatement
    console.log('subscribeLobbyList - envoi état initial:', this.lobbyListState)
    callback(this.lobbyListState)

    return () => {
      console.log('subscribeLobbyList - suppression callback')
      this.lobbyListCallbacks.delete(callback)
    }
  }

  subscribeLobbyDetail(lobbyUuid: string, callback: (state: LobbyDetailState) => void) {
    if (!this.lobbyDetailCallbacks.has(lobbyUuid)) {
      this.lobbyDetailCallbacks.set(lobbyUuid, new Set())
      console.log(`S'abonner au canal spécifique du lobby: lobbies/${lobbyUuid}`)

      // S'abonner au canal Transmit pour ce lobby
      this.transmitContext.subscribeToLobby(lobbyUuid, (event) => {
        console.log(`Événement reçu sur canal lobbies/${lobbyUuid}:`, event.type, event)

        // Convertir l'événement Transmit en format compatible
        const transmitEvent = {
          type: event.type,
          data: event,
          timestamp: event.timestamp || new Date().toISOString(),
          channel: `lobbies/${lobbyUuid}`,
        }

        // Dispatcher vers les handlers appropriés
        switch (event.type) {
          case 'lobby.player.joined':
            console.log('Traitement événement lobby.player.joined pour détails')
            this.handleLobbyPlayerJoined(transmitEvent)
            break
          case 'lobby.player.left':
            console.log('Traitement événement lobby.player.left pour détails')
            this.handleLobbyPlayerLeft(transmitEvent)
            break
          case 'lobby.status.changed':
            console.log('Traitement événement lobby.status.changed pour détails')
            this.handleLobbyStatusChanged(transmitEvent)
            break
          case 'lobby.updated':
            console.log('Traitement événement lobby.updated pour détails')
            this.handleLobbyDetailUpdated(transmitEvent)
            break
          case 'lobby.deleted':
            console.log('Traitement événement lobby.deleted pour détails')
            this.handleLobbyDeleted(transmitEvent)
            break
          default:
            console.log(`Événement non géré: ${event.type}`)
        }
      })
    }

    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)!
    callbacks.add(callback)

    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        console.log(`Se désabonner du canal lobbies/${lobbyUuid}`)
        this.lobbyDetailCallbacks.delete(lobbyUuid)
        // Se désabonner du canal Transmit
        this.transmitContext.unsubscribeFrom(`lobbies/${lobbyUuid}`)
      }
    }
  }

  // Nettoyage
  destroy() {
    console.log('Destruction du LobbyService')
    if (this.globalUnsubscribe) {
      this.globalUnsubscribe()
      this.globalUnsubscribe = null
    }
    this.lobbyListCallbacks.clear()
    this.lobbyDetailCallbacks.clear()
  }
}
