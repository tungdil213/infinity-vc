import {
  LobbyEventBroadcaster,
  ClientConnection,
  WebSocketServer,
} from '../../application/services/lobby_event_broadcaster.js'
import { LobbyNotificationService } from '../../application/services/lobby_notification_service.js'
import { sseConnectionManager } from './connection_manager.js'
import { channelManager } from './channel_manager.js'
import { SSEEvent, SSEConnection } from './types.js'
import { LobbyEventType } from '../../domain/events/lobby_event_types.js'
import crypto from 'node:crypto'

/**
 * Adaptateur qui connecte le LobbyEventBroadcaster au système SSE existant
 * Permet d'utiliser les connexions SSE comme transport pour les événements lobby
 */
export class LobbySSEAdapter implements WebSocketServer {
  private broadcaster: LobbyEventBroadcaster | null = null

  constructor(private notificationService: LobbyNotificationService) {
    this.initializeBroadcaster()
  }

  private initializeBroadcaster(): void {
    this.broadcaster = new LobbyEventBroadcaster(this, this.notificationService)
  }

  /**
   * Ajoute une connexion (implémentation WebSocketServer)
   * Dans le contexte SSE, cette méthode n'est pas utilisée directement
   */
  addConnection(_connection: ClientConnection): void {
    // Les connexions SSE sont gérées par sseConnectionManager
    // Cette méthode est requise par l'interface mais n'est pas utilisée
  }

  /**
   * Supprime une connexion (implémentation WebSocketServer)
   */
  removeConnection(_connectionId: string): void {
    // Les connexions SSE sont gérées par sseConnectionManager
    // Cette méthode est requise par l'interface mais n'est pas utilisée
  }

  /**
   * Diffuse un message aux connexions filtrées (implémentation WebSocketServer)
   */
  broadcast(message: any, filter?: (conn: ClientConnection) => boolean): void {
    this.broadcastLobbyEvent(message, filter)
  }

  /**
   * Récupère les connexions (implémentation WebSocketServer)
   */
  getConnections(): ClientConnection[] {
    // Convertit les connexions SSE en format ClientConnection
    const sseConnections = sseConnectionManager.getAllConnections()
    return sseConnections.map((conn: SSEConnection) => ({
      id: conn.id,
      userId: conn.userId,
      lobbyId: conn.metadata?.lobbyId,
      isOpen: conn.isActive,
      send: (data: string) => {
        try {
          const event = JSON.parse(data)
          this.sendSSEEvent(conn.id, event)
        } catch (error) {
          console.error('Error parsing message for SSE:', error)
        }
      },
      close: () => {
        sseConnectionManager.removeConnection(conn.id)
      },
    }))
  }

  /**
   * Diffuse un événement lobby via SSE
   */
  private async broadcastLobbyEvent(
    message: any,
    filter?: (conn: ClientConnection) => boolean
  ): Promise<void> {
    try {
      // Convertir le message en événement SSE
      const sseEvent: SSEEvent = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type: this.mapLobbyEventTypeToSSE(message.type),
        data: message,
      }

      // Si un filtre est fourni, l'appliquer aux connexions
      if (filter) {
        const connections = this.getConnections()
        const filteredConnections = connections.filter(filter)

        for (const conn of filteredConnections) {
          await this.sendSSEEvent(conn.id, sseEvent)
        }
      } else {
        // Diffuser à tous les clients connectés au lobby
        const lobbyId = message.lobbyUuid || message.lobbyId
        if (lobbyId) {
          await channelManager.broadcastToChannel(`lobby:${lobbyId}`, sseEvent)
        }
      }
    } catch (error) {
      console.error('Error broadcasting lobby event via SSE:', error)
    }
  }

  /**
   * Envoie un événement SSE à une connexion spécifique
   */
  private async sendSSEEvent(connectionId: string, event: SSEEvent): Promise<void> {
    try {
      const connection = sseConnectionManager.getConnection(connectionId)
      if (connection && connection.isActive) {
        // Use sendToConnection method instead of direct write
        await sseConnectionManager.sendToConnection(connectionId, event)
      }
    } catch (error) {
      console.error(`Error sending SSE event to connection ${connectionId}:`, error)
    }
  }

  /**
   * Mappe les types d'événements lobby vers les types SSE
   */
  private mapLobbyEventTypeToSSE(lobbyEventType: LobbyEventType): string {
    switch (lobbyEventType) {
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
        return 'lobby.event'
    }
  }

  /**
   * Abonne une connexion SSE aux événements d'un lobby spécifique
   */
  async subscribeLobbyConnection(connectionId: string, lobbyUuid: string): Promise<boolean> {
    try {
      const connection = sseConnectionManager.getConnection(connectionId)
      if (!connection) {
        return false
      }

      // Mettre à jour les métadonnées de la connexion avec l'ID du lobby
      connection.metadata = { ...connection.metadata, lobbyId: lobbyUuid }

      // S'abonner au canal lobby
      return channelManager.subscribeToChannel(connectionId, `lobby:${lobbyUuid}`)
    } catch (error) {
      console.error(`Error subscribing connection ${connectionId} to lobby ${lobbyUuid}:`, error)
      return false
    }
  }

  /**
   * Désabonne une connexion SSE des événements d'un lobby
   */
  async unsubscribeLobbyConnection(connectionId: string, lobbyUuid: string): Promise<boolean> {
    try {
      const connection = sseConnectionManager.getConnection(connectionId)
      if (!connection) {
        return false
      }

      // Supprimer l'ID du lobby des métadonnées
      if (connection.metadata?.lobbyId === lobbyUuid) {
        delete connection.metadata.lobbyId
      }

      // Se désabonner du canal lobby
      return channelManager.unsubscribeFromChannel(connectionId, `lobby:${lobbyUuid}`)
    } catch (error) {
      console.error(
        `Error unsubscribing connection ${connectionId} from lobby ${lobbyUuid}:`,
        error
      )
      return false
    }
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    if (this.broadcaster) {
      this.broadcaster.destroy()
      this.broadcaster = null
    }
  }
}

// Instance singleton de l'adaptateur
export const lobbySSEAdapter = new LobbySSEAdapter(new LobbyNotificationService())
