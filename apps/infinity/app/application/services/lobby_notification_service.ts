import { 
  LobbyEvent, 
  LobbyEventListener, 
  LobbyEventType, 
  UnsubscribeFunction,
  LobbyCreatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  StatusChangedEvent,
  GameStartedEvent,
  LobbyDeletedEvent
} from '../../domain/events/lobby_event_types.js'
import { sseService } from '../../infrastructure/sse/sse_service.js'

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
   * Notifie qu'un lobby a été créé
   */
  notifyLobbyCreated(lobbyUuid: string, lobby: any): void {
    const event: LobbyCreatedEvent = {
      type: LobbyEventType.LOBBY_CREATED,
      lobbyUuid,
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
   * Diffuse un événement à tous les listeners et via SSE
   */
  private broadcastEvent(event: LobbyEvent): void {
    // Diffuser aux listeners globaux
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Erreur lors de la notification d\'un listener:', error)
      }
    })

    // Diffuser aux listeners spécifiques au lobby
    const lobbyListeners = this.lobbyListeners.get(event.lobbyUuid)
    if (lobbyListeners) {
      lobbyListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Erreur lors de la notification d\'un listener de lobby:', error)
        }
      })
    }

    // Diffuser via SSE pour les mises à jour temps réel
    this.broadcastEventViaSSE(event)
  }

  /**
   * Diffuse un événement via SSE selon son type
   */
  private async broadcastEventViaSSE(event: LobbyEvent): Promise<void> {
    try {
      const sseEventData = {
        type: this.mapEventTypeToSSE(event.type),
        data: {
          lobbyUuid: event.lobbyUuid,
          lobby: event.lobby,
          timestamp: event.timestamp,
          ...this.getEventSpecificData(event)
        }
      }

      // Diffuser globalement pour les mises à jour de liste
      if (this.isListUpdateEvent(event.type)) {
        await sseService.broadcastGlobal(sseEventData)
      }

      // Diffuser au lobby spécifique
      await sseService.broadcastToLobby(event.lobbyUuid, sseEventData)
    } catch (error) {
      console.error('Erreur lors de la diffusion SSE:', error)
    }
  }

  /**
   * Mappe les types d'événements internes vers les types SSE
   */
  private mapEventTypeToSSE(eventType: LobbyEventType): string {
    switch (eventType) {
      case LobbyEventType.LOBBY_CREATED:
        return 'lobby.created'
      case LobbyEventType.PLAYER_JOINED:
        return 'lobby.player.joined'
      case LobbyEventType.PLAYER_LEFT:
        return 'lobby.player.left'
      case LobbyEventType.STATUS_CHANGED:
        return 'lobby.status.changed'
      case LobbyEventType.GAME_STARTED:
        return 'lobby.game.started'
      case LobbyEventType.LOBBY_DELETED:
        return 'lobby.deleted'
      default:
        return 'lobby.updated'
    }
  }

  /**
   * Extrait les données spécifiques à chaque type d'événement
   */
  private getEventSpecificData(event: LobbyEvent): Record<string, any> {
    switch (event.type) {
      case LobbyEventType.PLAYER_JOINED:
        const joinedEvent = event as PlayerJoinedEvent
        return {
          player: joinedEvent.player,
          playerCount: joinedEvent.lobby?.currentPlayers || 0
        }
      case LobbyEventType.PLAYER_LEFT:
        const leftEvent = event as PlayerLeftEvent
        return {
          player: leftEvent.player,
          playerCount: leftEvent.lobby?.currentPlayers || 0
        }
      case LobbyEventType.STATUS_CHANGED:
        const statusEvent = event as StatusChangedEvent
        return {
          oldStatus: statusEvent.oldStatus,
          newStatus: statusEvent.newStatus,
          status: statusEvent.newStatus
        }
      case LobbyEventType.GAME_STARTED:
        const gameEvent = event as GameStartedEvent
        return {
          gameUuid: gameEvent.gameUuid
        }
      default:
        return {}
    }
  }

  /**
   * Détermine si l'événement nécessite une mise à jour de la liste globale
   */
  private isListUpdateEvent(eventType: LobbyEventType): boolean {
    return [
      LobbyEventType.LOBBY_CREATED,
      LobbyEventType.LOBBY_DELETED,
      LobbyEventType.STATUS_CHANGED,
      LobbyEventType.PLAYER_JOINED,
      LobbyEventType.PLAYER_LEFT
    ].includes(eventType)
  }
}
