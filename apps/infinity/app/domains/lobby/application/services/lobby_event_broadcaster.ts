import { LobbyNotificationService } from './lobby_notification_service.js'
import { LobbyEventType, LobbyEvent } from '../../domain/events/lobby_event_types.js'

/**
 * Interface pour une connexion WebSocket/SSE
 */
export interface ClientConnection {
  id: string
  userId?: string
  lobbyId?: string
  send: (data: string) => void
  close: () => void
  isOpen: boolean
}

/**
 * Interface pour le serveur WebSocket/SSE
 */
export interface WebSocketServer {
  addConnection: (connection: ClientConnection) => void
  removeConnection: (connectionId: string) => void
  broadcast: (message: any, filter?: (conn: ClientConnection) => boolean) => void
  getConnections: () => ClientConnection[]
}

/**
 * Service responsable de la diffusion des événements lobby vers les clients connectés
 * via WebSocket ou Server-Sent Events (SSE)
 */
export class LobbyEventBroadcaster {
  private connections: Map<string, ClientConnection> = new Map()
  private unsubscribeFunctions: Array<() => void> = []

  constructor(
    private webSocketServer: WebSocketServer,
    private notificationService: LobbyNotificationService
  ) {
    this.setupEventListeners()
  }

  /**
   * Configure les listeners pour les événements du LobbyNotificationService
   */
  private setupEventListeners(): void {
    // Écouter tous les événements lobby et les diffuser aux clients appropriés
    const unsubscribe = this.notificationService.addListener((event: LobbyEvent) => {
      this.broadcastEvent(event)
    })

    this.unsubscribeFunctions.push(unsubscribe)
  }

  /**
   * Ajoute une nouvelle connexion client
   */
  addConnection(connection: ClientConnection): void {
    this.connections.set(connection.id, connection)
    this.webSocketServer.addConnection(connection)
  }

  /**
   * Supprime une connexion client
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId)
    this.webSocketServer.removeConnection(connectionId)
  }

  /**
   * Retourne toutes les connexions actives
   */
  getConnections(): ClientConnection[] {
    return Array.from(this.connections.values())
  }

  /**
   * Diffuse un événement aux clients appropriés
   */
  private broadcastEvent(event: LobbyEvent): void {
    const message = this.formatEventMessage(event)

    // Extraire l'ID du lobby selon le type d'événement
    const lobbyId = this.extractLobbyId(event)

    // Filtrer les connexions selon le type d'événement et le lobby
    const filter = (connection: ClientConnection): boolean => {
      // Si la connexion n'est pas ouverte, ne pas envoyer
      if (!connection.isOpen) {
        return false
      }

      // Pour les événements lobby, envoyer seulement aux membres du lobby concerné
      if (lobbyId && connection.lobbyId) {
        return connection.lobbyId === lobbyId
      }

      // Pour les événements globaux, envoyer à tous
      return true
    }

    try {
      this.webSocketServer.broadcast(message, filter)
    } catch (error) {
      console.error('Error broadcasting event:', error)
    }
  }

  /**
   * Extrait l'ID du lobby d'un événement
   */
  private extractLobbyId(event: LobbyEvent): string | undefined {
    return event.lobbyUuid
  }

  /**
   * Formate un événement pour l'envoi aux clients
   */
  private formatEventMessage(event: LobbyEvent): any {
    const baseMessage = {
      type: event.type,
      timestamp: new Date().toISOString(),
      lobbyId: event.lobbyUuid,
    }

    switch (event.type) {
      case LobbyEventType.PLAYER_JOINED:
        return {
          ...baseMessage,
          player: event.player,
          lobby: event.lobby,
        }

      case LobbyEventType.PLAYER_LEFT:
        return {
          ...baseMessage,
          player: event.player,
          lobby: event.lobby,
        }

      case LobbyEventType.STATUS_CHANGED:
        return {
          ...baseMessage,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
          lobby: event.lobby,
        }

      case LobbyEventType.GAME_STARTED:
        return {
          ...baseMessage,
          gameId: event.gameUuid,
          lobby: event.lobby,
        }

      case LobbyEventType.LOBBY_DELETED:
        return {
          ...baseMessage,
          lobby: event.lobby,
        }

      default:
        return baseMessage
    }
  }

  /**
   * Nettoie les connexions fermées
   */
  cleanupClosedConnections(): void {
    const closedConnections: string[] = []

    for (const [id, connection] of this.connections) {
      if (!connection.isOpen) {
        closedConnections.push(id)
      }
    }

    closedConnections.forEach((id) => {
      this.removeConnection(id)
    })
  }

  /**
   * Nettoie les ressources lors de la destruction du service
   */
  destroy(): void {
    // Désabonner de tous les événements
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeFunctions = []

    // Fermer toutes les connexions
    for (const connection of this.connections.values()) {
      try {
        connection.close()
      } catch (error) {
        console.error('Error closing connection:', error)
      }
    }

    this.connections.clear()
  }
}
