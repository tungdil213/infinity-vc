import { TransmitContextType } from '../contexts/TransmitContext'
import { createBrowserLogger } from '../utils/browser_logger'

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
  private logger = createBrowserLogger('LobbyService')
  private transmitContext: TransmitContextType
  private globalUnsubscribe: (() => void) | null = null
  private lobbyUnsubscribes = new Map<string, () => void>()
  private lobbyListCallbacks = new Set<(state: LobbyListState) => void>()
  private lobbyDetailCallbacks = new Map<string, Set<(state: any) => void>>()
  private lobbyDetailStates = new Map<string, LobbyDetailState>()
  private isInitialized = false

  // État interne pour la liste des lobbies
  private lobbyListState: LobbyListState = {
    lobbies: [],
    loading: false, // Commencer avec loading: false pour ne pas masquer les données Inertia
    error: null,
    total: 0,
  }

  constructor(transmitContext: TransmitContextType) {
    this.logger.debug('Constructor called')
    this.transmitContext = transmitContext
    // Ne pas initialiser automatiquement - attendre l'appel explicite
  }

  /**
   * Initialiser le service avec les données Inertia comme source de vérité
   * Respecte le pattern: Inertia = données initiales, Transmit = mises à jour temps réel
   */
  initializeWithInertiaData(initialLobbies: LobbyData[]) {
    if (this.isInitialized) {
      return
    }

    this.logger.info({ count: initialLobbies.length }, 'Initializing with Inertia data')

    // Source de vérité initiale = données Inertia
    this.lobbyListState = {
      lobbies: initialLobbies,
      loading: false,
      error: null,
      total: initialLobbies.length,
    }

    // Ensuite, configurer Transmit pour les mises à jour temps réel
    this.setupTransmitListeners()
    this.isInitialized = true
  }

  private async setupTransmitListeners() {
    try {
      // Si une subscription existe déjà, la nettoyer proprement avant de se réabonner.
      // Ceci couvre les cas où Transmit a fait un unsubscribeAll() (reconnect, cleanup, etc.)
      if (this.globalUnsubscribe) {
        this.logger.debug(
          'Existing global lobbies subscription found, unsubscribing before re-subscribe'
        )
        try {
          this.globalUnsubscribe()
        } catch (error) {
          this.logger.error({ error }, 'Error while unsubscribing previous lobbies subscription')
        }
        this.globalUnsubscribe = null
      }

      this.logger.debug('Configuring Transmit listeners')

      // S'abonner au canal global des lobbies
      this.globalUnsubscribe = await this.transmitContext.subscribeToLobbies((event) => {
        this.logger.debug({ eventType: event.type }, 'Event received')

        // Normaliser le format de l'événement pour les handlers
        const transmitEvent = {
          type: event.type,
          data: event,
          timestamp: event.timestamp || new Date().toISOString(),
          channel: 'lobbies',
        }

        // Router l'événement vers le bon handler
        switch (event.type) {
          case 'lobby.created':
            this.handleLobbyCreated(transmitEvent)
            break

          case 'lobby.deleted':
            this.handleLobbyDeleted(transmitEvent)
            break

          case 'lobby.player.joined':
            this.handleLobbyPlayerJoined(transmitEvent)
            break

          case 'lobby.player.left':
            this.handleLobbyPlayerLeft(transmitEvent)
            break

          case 'lobby.closed':
            this.handleLobbyClosed(transmitEvent)
            break

          case 'lobby.owner.changed':
            this.handleOwnerChanged(transmitEvent)
            break

          case 'lobby.status.changed':
            this.handleLobbyStatusChanged(transmitEvent)
            break

          default:
            this.logger.warn({ eventType: event.type }, 'Unhandled event')
        }
      })

      this.logger.info('Transmit listeners ready')
    } catch (error) {
      this.logger.error({ error }, 'Failed to configure Transmit listeners')
      // Fallback gracieux - le service continue de fonctionner avec les données Inertia uniquement
    }
  }

  // Gestion des événements SSE pour la liste des lobbies
  private handleLobbyCreated(event: any) {
    const newLobby = event.data.lobby

    if (!newLobby || !newLobby.uuid) {
      this.logger.error('Invalid lobby data in create event')
      return
    }

    // Vérifier si le lobby n'existe pas déjà (éviter les doublons)
    const existingIndex = this.lobbyListState.lobbies.findIndex((l) => l.uuid === newLobby.uuid)

    if (existingIndex !== -1) {
      return
    }

    // Ajouter le lobby avec immutabilité stricte
    const updatedLobbies = [...this.lobbyListState.lobbies, newLobby]

    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: updatedLobbies,
      total: updatedLobbies.length,
      loading: false,
      error: null,
    }

    this.logger.info(
      { lobbyName: newLobby.name, total: this.lobbyListState.total },
      'Lobby created'
    )

    // Notifier tous les abonnés
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
    const updatedLobby = eventData.lobby

    this.logger.debug({ lobbyUuid, player, playerCount }, 'Player joined event received')

    if (lobbyUuid) {
      // Mettre à jour la liste globale
      if (playerCount !== undefined) {
        this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      }

      // Mettre à jour les détails du lobby
      this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
        // ✅ SOURCE DE VÉRITÉ: Le backend envoie l'état complet, on remplace simplement
        if (updatedLobby && updatedLobby.players) {
          this.logger.debug(
            { players: updatedLobby.players?.length },
            'Replacing with complete server state (player joined)'
          )
          // Fusionner pour préserver les champs non envoyés (name, createdAt, etc.)
          return currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
        }

        // Fallback: mise à jour partielle si pas d'état complet (ne devrait plus arriver)
        if (!currentLobby) {
          this.logger.warn('No lobby in cache for partial update')
          return currentLobby
        }

        this.logger.warn('Fallback to partial update (incomplete server state)')
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

    this.logger.debug({ lobbyUuid, player, playerCount }, 'Player left event received')

    if (lobbyUuid) {
      // Mettre à jour la liste globale
      if (playerCount !== undefined) {
        this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      }

      // Mettre à jour les détails du lobby
      this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
        this.logger.debug(
          {
            hasCurrentLobby: !!currentLobby,
            currentLobbyPlayers: currentLobby?.players?.length,
            hasUpdatedLobby: !!updatedLobby,
            updatedLobbyPlayers: updatedLobby?.players?.length,
          },
          'Update lobby detail callback (player left)'
        )

        // ✅ SOURCE DE VÉRITÉ: Le backend envoie l'état complet, on remplace simplement
        if (updatedLobby && updatedLobby.players) {
          this.logger.debug(
            { players: updatedLobby.players.length },
            'Replacing with complete server state (player left)'
          )
          const merged = currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
          this.logger.debug({ uuid: merged.uuid, players: merged.players?.length }, 'Lobby merged')
          return merged
        }

        this.logger.warn('Fallback - no complete server state')

        // Fallback
        if (!currentLobby) {
          this.logger.warn('No currentLobby, returning null')
          return null
        }

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

        this.logger.debug({ players: updatedCurrentLobby.players.length }, 'Fallback update done')
        return updatedCurrentLobby
      })
    }
  }

  private handleLobbyClosed(event: any) {
    const eventData = event.data
    const lobbyUuid = eventData.lobbyUuid
    const reason = eventData.reason

    this.logger.info({ lobbyUuid, reason }, 'Lobby closed event received')

    if (!lobbyUuid) return

    // Supprimer le lobby de la liste globale
    this.lobbyListState.lobbies = this.lobbyListState.lobbies.filter(
      (lobby: any) => lobby.uuid !== lobbyUuid
    )
    this.lobbyListState.total = this.lobbyListState.lobbies.length
    this.notifyLobbyListSubscribers()

    // Notifier les abonnés de détails que le lobby n'existe plus
    this.updateLobbyDetail(lobbyUuid, () => null)

    // Nettoyer l'état interne (le prochain subscribe repartira d'un état propre)
    this.lobbyDetailStates.delete(lobbyUuid)
  }

  private handleOwnerChanged(event: any) {
    const eventData = event.data
    const lobbyUuid = eventData.lobbyUuid
    const newOwner = eventData.newOwner
    const updatedLobby = eventData.lobby

    this.logger.info({ lobbyUuid, newOwner }, 'Owner changed event received')

    if (!lobbyUuid) return

    // Mettre à jour les détails du lobby avec le nouvel owner
    this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
      if (updatedLobby && updatedLobby.players) {
        return { ...currentLobby, ...updatedLobby }
      }

      // Fallback: mettre à jour juste l'owner dans les players
      if (currentLobby && currentLobby.players) {
        return {
          ...currentLobby,
          players: currentLobby.players.map((p) => ({
            ...p,
            isOwner: p.uuid === newOwner.uuid,
          })),
        }
      }

      return currentLobby
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
    this.logger.debug({ event }, 'Lobby deleted event received')
    const lobbyUuid = event.data.lobbyUuid || event.data.lobby?.uuid
    this.logger.info({ lobbyUuid }, 'Deleting lobby')

    if (!lobbyUuid) {
      this.logger.error('lobbyUuid missing in event.data')
      return
    }

    // Supprimer le lobby de la liste avec immutabilité
    const filteredLobbies = this.lobbyListState.lobbies.filter((l) => l.uuid !== lobbyUuid)
    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: filteredLobbies,
      total: filteredLobbies.length,
    }

    this.logger.info({ total: this.lobbyListState.total }, 'Lobby deleted')
    this.notifyLobbyListSubscribers()
    this.updateLobbyDetail(lobbyUuid, () => null)
  }

  // Méthodes utilitaires
  private updateLobbyInList(lobbyUuid: string, updates: Partial<LobbyData>) {
    const index = this.lobbyListState.lobbies.findIndex((l) => l.uuid === lobbyUuid)

    if (index === -1) {
      // ✅ Normal: la liste n'est pas forcément chargée (ex: sur GameLobby)
      this.logger.debug({ lobbyUuid }, 'List not loaded, skipping updateLobbyInList')
      return
    }

    // Immutabilité stricte
    const updatedLobbies = [...this.lobbyListState.lobbies]
    updatedLobbies[index] = { ...updatedLobbies[index], ...updates }

    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: updatedLobbies,
    }

    this.logger.debug({ lobbyUuid, updates }, 'Lobby updated in list')
    this.notifyLobbyListSubscribers()
  }

  private updateLobbyDetail(
    lobbyUuid: string,
    updater: (lobby: LobbyData | null) => LobbyData | null
  ) {
    const callbacks = this.lobbyDetailCallbacks.get(lobbyUuid)
    if (callbacks && callbacks.size > 0) {
      this.logger.debug({ lobbyUuid, subscribersCount: callbacks.size }, 'Updating lobby details')

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
        this.logger.debug({ lobbyUuid }, 'Notifying subscriber')
        callback(newState)
      })
    } else {
      this.logger.debug({ lobbyUuid }, 'No subscribers, skipping update')
    }
  }

  private notifyLobbyListSubscribers() {
    this.logger.debug(
      { callbackCount: this.lobbyListCallbacks.size, state: this.lobbyListState },
      'Notifying lobby list subscribers'
    )

    if (this.lobbyListCallbacks.size === 0) {
      this.logger.warn('No callbacks registered for lobby list')
      this.logger.debug('Service created but no subscribers - check hooks initialization')
      return
    }

    let callbackIndex = 0
    this.lobbyListCallbacks.forEach((callback) => {
      callbackIndex++
      this.logger.debug({ callbackIndex, total: this.lobbyListCallbacks.size }, 'Calling callback')
      try {
        callback(this.lobbyListState)
        this.logger.debug({ callbackIndex }, 'Callback executed successfully')
      } catch (error) {
        this.logger.error({ error, callbackIndex }, 'Callback execution failed')
      }
    })
  }

  // API publique
  async fetchLobbies(filters?: { status?: string; hasSlots?: boolean; includePrivate?: boolean }) {
    this.logger.info({ filters }, 'Fetching lobbies')

    this.lobbyListState = {
      ...this.lobbyListState,
      loading: true,
      error: null,
    }
    this.notifyLobbyListSubscribers()

    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.hasSlots !== undefined) params.append('hasSlots', filters.hasSlots.toString())
      if (filters?.includePrivate !== undefined)
        params.append('includePrivate', filters.includePrivate.toString())

      const url = `/api/v1/lobbies?${params.toString()}`
      this.logger.debug({ url }, 'API call')

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch lobbies: ${response.statusText}`)
      }

      const data = await response.json()
      this.logger.info(
        { count: data.data?.length, total: data.meta?.total },
        'Lobbies fetched successfully'
      )

      this.lobbyListState = {
        ...this.lobbyListState,
        lobbies: data.data || [],
        total: data.meta?.total || 0,
        loading: false,
        error: null,
      }

      this.notifyLobbyListSubscribers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error({ error: errorMessage }, 'Failed to fetch lobbies')

      this.lobbyListState = {
        ...this.lobbyListState,
        error: errorMessage,
        loading: false,
      }

      this.notifyLobbyListSubscribers()
    }
  }

  async fetchLobbyDetails(lobbyUuid: string): Promise<LobbyData | null> {
    this.logger.info({ lobbyUuid }, 'Fetching lobby details')
    try {
      const url = `/api/v1/lobbies/${lobbyUuid}`
      this.logger.debug({ url }, 'API call')

      const response = await fetch(url, {
        credentials: 'include',
      })

      this.logger.debug({ status: response.status }, 'API response received')

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error({ status: response.status, error: errorText }, 'API error')
        throw new Error(`Failed to fetch lobby: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      this.logger.debug({ data }, 'API data received')

      // Vérifier la structure de la réponse
      if (data.lobby) {
        this.logger.debug('Lobby found in response.lobby')
        return data.lobby
      } else if (data.data) {
        this.logger.debug('Lobby found in response.data')
        return data.data
      } else {
        this.logger.warn({ data }, 'Unexpected response structure')
        return data
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch lobby details')
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
  subscribeLobbyList(callback: (state: LobbyListState) => void): () => void {
    console.log('📡 subscribeLobbyList appelé - ajout callback')
    console.log('📡 subscribeLobbyList - instance service:', this)
    console.log('📡 subscribeLobbyList - callbacks avant ajout:', this.lobbyListCallbacks.size)
    this.lobbyListCallbacks.add(callback)
    console.log('📡 subscribeLobbyList - callbacks après ajout:', this.lobbyListCallbacks.size)
    console.log('📡 subscribeLobbyList - état actuel à envoyer:', this.lobbyListState)

    // Envoyer l'état actuel immédiatement
    callback(this.lobbyListState)

    // Retourner la fonction de désabonnement
    return () => {
      console.log('📡 unsubscribeLobbyList appelé - suppression callback')
      this.lobbyListCallbacks.delete(callback)
      console.log('📡 unsubscribeLobbyList - callbacks restants:', this.lobbyListCallbacks.size)
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
          case 'lobby.owner.changed':
            console.log('Traitement événement lobby.owner.changed pour détails')
            this.handleOwnerChanged(transmitEvent)
            break
          case 'lobby.closed':
            console.log('Traitement événement lobby.closed pour détails')
            this.handleLobbyClosed(transmitEvent)
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

    // Réinitialiser complètement l'état interne pour permettre une nouvelle initialisation propre
    this.lobbyListState = {
      lobbies: [],
      loading: false,
      error: null,
      total: 0,
    }
    this.lobbyDetailStates.clear()
    this.isInitialized = false
  }
}
