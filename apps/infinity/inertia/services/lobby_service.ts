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
    console.log('📡 LobbyService: Constructor called')
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

    console.log(`📡 LobbyService: Initializing with ${initialLobbies.length} lobbies`)

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
      // Éviter les souscriptions multiples
      if (this.globalUnsubscribe) {
        return
      }

      console.log('📡 LobbyService: Configuration Transmit listeners')

      // S'abonner au canal global des lobbies
      this.globalUnsubscribe = await this.transmitContext.subscribeToLobbies((event) => {
        console.log(`📡 LobbyService: Event received: ${event.type}`)

        // Router l'événement vers le bon handler
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
            this.handleLobbyPlayerJoined(event)
            break

          case 'lobby.player.left':
            this.handleLobbyPlayerLeft(event)
            break

          case 'lobby.status.changed':
            this.handleLobbyStatusChanged({
              type: event.type,
              data: event,
              timestamp: event.timestamp,
              channel: 'lobbies',
            })
            break

          default:
            console.warn('📡 LobbyService: Événement non géré:', event.type)
        }
      })

      console.log('📡 LobbyService: Transmit listeners ready')
    } catch (error) {
      console.error('📡 LobbyService: ❌ Erreur lors de la configuration:', error)
      // Fallback gracieux - le service continue de fonctionner avec les données Inertia uniquement
    }
  }

  // Gestion des événements SSE pour la liste des lobbies
  private handleLobbyCreated(event: any) {
    const newLobby = event.data.lobby

    if (!newLobby || !newLobby.uuid) {
      console.error('📡 LobbyService: Invalid lobby data in create event')
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

    console.log(
      `📡 LobbyService: Lobby created: ${newLobby.name} (total: ${this.lobbyListState.total})`
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

    console.log('📡 LobbyService: handleLobbyPlayerJoined - données:', {
      lobbyUuid,
      player,
      playerCount,
      // ⚠️ DEBUG: Vérifier l'état complet reçu
      hasUpdatedLobby: !!updatedLobby,
      updatedLobbyKeys: updatedLobby ? Object.keys(updatedLobby) : [],
      hasPlayers: !!updatedLobby?.players,
      playersCount: updatedLobby?.players?.length,
      playersValue: updatedLobby?.players,
    })

    if (lobbyUuid) {
      // Mettre à jour la liste globale
      if (playerCount !== undefined) {
        this.updateLobbyInList(lobbyUuid, { currentPlayers: playerCount })
      }

      // Mettre à jour les détails du lobby
      this.updateLobbyDetail(lobbyUuid, (currentLobby) => {
        // ✅ SOURCE DE VÉRITÉ: Le backend envoie l'état complet, on remplace simplement
        if (updatedLobby && updatedLobby.players) {
          console.log(
            '📡 LobbyService: Remplacement complet avec état du serveur (player joined)',
            {
              players: updatedLobby.players?.length,
              currentPlayers: updatedLobby.currentPlayers,
            }
          )
          // Fusionner pour préserver les champs non envoyés (name, createdAt, etc.)
          return currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
        }

        // Fallback: mise à jour partielle si pas d'état complet (ne devrait plus arriver)
        if (!currentLobby) {
          console.warn('📡 LobbyService: Pas de lobby en cache pour mise à jour partielle')
          return currentLobby
        }

        console.log(
          '📡 LobbyService: ⚠️ Fallback mise à jour partielle (état incomplet du serveur)'
        )
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
        console.log('📡 LobbyService: updateLobbyDetail callback (player left)', {
          hasCurrentLobby: !!currentLobby,
          currentLobbyPlayers: currentLobby?.players?.length,
          hasUpdatedLobby: !!updatedLobby,
          updatedLobbyHasPlayers: !!updatedLobby?.players,
          updatedLobbyPlayersLength: updatedLobby?.players?.length,
        })

        // ✅ SOURCE DE VÉRITÉ: Le backend envoie l'état complet, on remplace simplement
        if (updatedLobby && updatedLobby.players) {
          console.log(
            '📡 LobbyService: ✅ Remplacement complet avec état du serveur (player left)',
            {
              players: updatedLobby.players.length,
              currentPlayers: updatedLobby.currentPlayers,
            }
          )
          const merged = currentLobby ? { ...currentLobby, ...updatedLobby } : updatedLobby
          console.log('📡 LobbyService: ✅ Lobby merged', {
            uuid: merged.uuid,
            players: merged.players?.length,
          })
          return merged
        }

        console.log("📡 LobbyService: ⚠️ Fallback - pas d'état complet du serveur")

        // Fallback
        if (!currentLobby) {
          console.warn('📡 LobbyService: ❌ Pas de currentLobby, retourne null')
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

        console.log('📡 LobbyService: ✅ Fallback update done', {
          players: updatedCurrentLobby.players.length,
        })
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
    const lobbyUuid = event.data.lobbyUuid || event.data.lobby?.uuid
    console.log('handleLobbyDeleted - suppression lobby:', lobbyUuid)

    if (!lobbyUuid) {
      console.error('handleLobbyDeleted - lobbyUuid manquant dans event.data')
      return
    }

    // Supprimer le lobby de la liste avec immutabilité
    const filteredLobbies = this.lobbyListState.lobbies.filter((l) => l.uuid !== lobbyUuid)
    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: filteredLobbies,
      total: filteredLobbies.length,
    }

    console.log('handleLobbyDeleted - lobby supprimé, nouveau total:', this.lobbyListState.total)
    this.notifyLobbyListSubscribers()
    this.updateLobbyDetail(lobbyUuid, () => null)
  }

  // Méthodes utilitaires
  private updateLobbyInList(lobbyUuid: string, updates: Partial<LobbyData>) {
    const index = this.lobbyListState.lobbies.findIndex((l) => l.uuid === lobbyUuid)

    if (index === -1) {
      // ✅ Normal: la liste n'est pas forcément chargée (ex: sur GameLobby)
      console.log('📡 LobbyService: Liste non chargée, skip updateLobbyInList:', lobbyUuid)
      return
    }

    // Immutabilité stricte
    const updatedLobbies = [...this.lobbyListState.lobbies]
    updatedLobbies[index] = { ...updatedLobbies[index], ...updates }

    this.lobbyListState = {
      ...this.lobbyListState,
      lobbies: updatedLobbies,
    }

    console.log('📡 LobbyService: Lobby mis à jour:', { lobbyUuid, updates })
    this.notifyLobbyListSubscribers()
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
    console.log(
      '📡 notifyLobbyListSubscribers - nombre de callbacks:',
      this.lobbyListCallbacks.size
    )
    console.log('📡 notifyLobbyListSubscribers - état actuel:', this.lobbyListState)

    if (this.lobbyListCallbacks.size === 0) {
      console.warn('📡 notifyLobbyListSubscribers - AUCUN CALLBACK ENREGISTRÉ!')
      console.log("📡 Service créé mais pas d'abonnés - vérifier l'initialisation des hooks")
      return
    }

    let callbackIndex = 0
    this.lobbyListCallbacks.forEach((callback) => {
      callbackIndex++
      console.log(
        `📡 notifyLobbyListSubscribers - appel callback ${callbackIndex}/${this.lobbyListCallbacks.size}`
      )
      try {
        callback(this.lobbyListState)
        console.log(`📡 notifyLobbyListSubscribers - callback ${callbackIndex} exécuté avec succès`)
      } catch (error) {
        console.error(`📡 notifyLobbyListSubscribers - erreur callback ${callbackIndex}:`, error)
      }
    })
  }

  // API publique
  async fetchLobbies(filters?: { status?: string; hasSlots?: boolean; includePrivate?: boolean }) {
    console.log('📡 LobbyService: fetchLobbies appelé avec filtres:', filters)

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
      console.log('📡 LobbyService: Appel API:', url)

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch lobbies: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📡 LobbyService: Données reçues:', {
        count: data.data?.length,
        total: data.meta?.total,
      })

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
      console.error('📡 LobbyService: ❌ Erreur fetch:', errorMessage)

      this.lobbyListState = {
        ...this.lobbyListState,
        error: errorMessage,
        loading: false,
      }

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
