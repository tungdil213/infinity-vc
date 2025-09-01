import { 
  LobbyEvent, 
  LobbyEventListener, 
  LobbyEventType, 
  UnsubscribeFunction,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  StatusChangedEvent,
  GameStartedEvent,
  LobbyDeletedEvent
} from '../../domain/events/lobby_event_types.js'

/**
 * Service de notification pour les événements de lobby
 * Gère la diffusion des événements en temps réel aux clients connectés
 */
export class LobbyNotificationService {
  private listeners: Set<LobbyEventListener> = new Set()
  private lobbyListeners: Map<string, Set<LobbyEventListener>> = new Map()

  /**
   * Ajoute un listener global pour tous les événements de lobby
   */
  addListener(listener: LobbyEventListener): UnsubscribeFunction {
    this.listeners.add(listener)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Ajoute un listener spécifique à un lobby
   */
  addLobbyListener(lobbyUuid: string, listener: LobbyEventListener): UnsubscribeFunction {
    if (!this.lobbyListeners.has(lobbyUuid)) {
      this.lobbyListeners.set(lobbyUuid, new Set())
    }
    
    this.lobbyListeners.get(lobbyUuid)!.add(listener)
    
    return () => {
      const lobbyListeners = this.lobbyListeners.get(lobbyUuid)
      if (lobbyListeners) {
        lobbyListeners.delete(listener)
        if (lobbyListeners.size === 0) {
          this.lobbyListeners.delete(lobbyUuid)
        }
      }
    }
  }

  /**
   * Supprime tous les listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
    this.lobbyListeners.clear()
  }

  /**
   * Notifie qu'un joueur a rejoint un lobby
   */
  notifyPlayerJoined(lobbyUuid: string, player: { uuid: string; nickName: string }, lobby: any): void {
    const event: PlayerJoinedEvent = {
      type: LobbyEventType.PLAYER_JOINED,
      lobbyUuid,
      player,
      lobby,
      timestamp: new Date()
    }
    
    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'un joueur a quitté un lobby
   */
  notifyPlayerLeft(lobbyUuid: string, player: { uuid: string; nickName: string }, lobby: any): void {
    const event: PlayerLeftEvent = {
      type: LobbyEventType.PLAYER_LEFT,
      lobbyUuid,
      player,
      lobby,
      timestamp: new Date()
    }
    
    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'un statut de lobby a changé
   */
  notifyStatusChanged(lobbyUuid: string, oldStatus: string, newStatus: string, lobby: any): void {
    const event: StatusChangedEvent = {
      type: LobbyEventType.STATUS_CHANGED,
      lobbyUuid,
      oldStatus,
      newStatus,
      lobby,
      timestamp: new Date()
    }
    
    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'une partie a commencé
   */
  notifyGameStarted(lobbyUuid: string, gameUuid: string, lobby: any): void {
    const event: GameStartedEvent = {
      type: LobbyEventType.GAME_STARTED,
      lobbyUuid,
      gameUuid,
      lobby,
      timestamp: new Date()
    }
    
    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'un lobby a été supprimé
   */
  notifyLobbyDeleted(lobbyUuid: string, lobby: any): void {
    const event: LobbyDeletedEvent = {
      type: LobbyEventType.LOBBY_DELETED,
      lobbyUuid,
      lobby,
      timestamp: new Date()
    }
    
    this.broadcastEvent(event)
    
    // Nettoyer les listeners spécifiques à ce lobby
    this.lobbyListeners.delete(lobbyUuid)
  }

  /**
   * Diffuse un événement à tous les listeners appropriés
   */
  private broadcastEvent(event: LobbyEvent): void {
    // Notifier les listeners globaux
    this.notifyListeners(this.listeners, event)
    
    // Notifier les listeners spécifiques au lobby
    const lobbyListeners = this.lobbyListeners.get(event.lobbyUuid)
    if (lobbyListeners) {
      this.notifyListeners(lobbyListeners, event)
    }
  }

  /**
   * Notifie un ensemble de listeners avec gestion d'erreur
   */
  private notifyListeners(listeners: Set<LobbyEventListener>, event: LobbyEvent): void {
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        // Log l'erreur mais continue avec les autres listeners
        console.error('Error in lobby event listener:', error)
      }
    })
  }
}
