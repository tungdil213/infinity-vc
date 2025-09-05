import transmit from '@adonisjs/transmit/services/main'
import {
  LobbyEvent,
  LobbyEventType,
  LobbyCreatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  StatusChangedEvent,
  GameStartedEvent,
  LobbyDeletedEvent,
} from '../../domain/events/lobby_event_types.js'

/**
 * Service de notification pour les événements de lobby utilisant Transmit
 * Remplace l'ancienne implémentation SSE custom
 */
export class TransmitLobbyService {
  /**
   * Notifie qu'un lobby a été créé
   */
  notifyLobbyCreated(lobbyUuid: string, lobby: any): void {
    const event: LobbyCreatedEvent = {
      type: LobbyEventType.LOBBY_CREATED,
      lobbyUuid,
      lobby,
      timestamp: new Date(),
    }

    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'un joueur a rejoint un lobby
   */
  notifyPlayerJoined(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobby: any
  ): void {
    const event: PlayerJoinedEvent = {
      type: LobbyEventType.PLAYER_JOINED,
      lobbyUuid,
      player,
      lobby,
      timestamp: new Date(),
    }

    this.broadcastEvent(event)
  }

  /**
   * Notifie qu'un joueur a quitté un lobby
   */
  notifyPlayerLeft(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobby: any
  ): void {
    const event: PlayerLeftEvent = {
      type: LobbyEventType.PLAYER_LEFT,
      lobbyUuid,
      player,
      lobby,
      timestamp: new Date(),
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
      timestamp: new Date(),
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
      timestamp: new Date(),
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
      timestamp: new Date(),
    }

    this.broadcastEvent(event)
  }

  /**
   * Diffuse un événement via Transmit
   */
  private broadcastEvent(event: LobbyEvent): void {
    try {
      const eventData = {
        type: this.mapEventTypeToTransmit(event.type),
        lobbyUuid: event.lobbyUuid,
        lobby: event.lobby,
        timestamp: event.timestamp.toISOString(),
        ...this.getEventSpecificData(event),
      }

      console.log(
        `[TransmitLobbyService] Broadcasting event ${eventData.type} for lobby ${event.lobbyUuid}`
      )

      // Diffuser globalement pour les mises à jour de liste
      if (this.isListUpdateEvent(event.type)) {
        this.safeBroadcast('lobbies', eventData, 'global')
      }

      // Diffuser au lobby spécifique
      this.safeBroadcast(`lobbies/${event.lobbyUuid}`, eventData, 'lobby-specific')
    } catch (error) {
      console.error('[TransmitLobbyService] Erreur lors de la diffusion Transmit:', error)
    }
  }

  /**
   * Diffuse de manière sécurisée en gérant les canaux inexistants
   */
  private safeBroadcast(channel: string, data: any, context: string): void {
    try {
      transmit.broadcast(channel, data)
      console.log(`[TransmitLobbyService] Successfully broadcasted to ${channel} (${context})`)
    } catch (error) {
      // Ne pas traiter comme une erreur critique si le canal n'existe pas
      if (
        error.message?.includes('non-existent channel') ||
        error.message?.includes('no subscribers')
      ) {
        console.log(
          `[TransmitLobbyService] No subscribers for channel ${channel} (${context}) - skipping broadcast`
        )
      } else {
        console.error(
          `[TransmitLobbyService] Failed to broadcast to ${channel} (${context}):`,
          error
        )
      }
    }
  }

  /**
   * Mappe les types d'événements internes vers les types Transmit
   */
  private mapEventTypeToTransmit(eventType: LobbyEventType): string {
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
          playerCount: joinedEvent.lobby?.currentPlayers || 0,
        }
      case LobbyEventType.PLAYER_LEFT:
        const leftEvent = event as PlayerLeftEvent
        return {
          player: leftEvent.player,
          playerCount: leftEvent.lobby?.currentPlayers || 0,
        }
      case LobbyEventType.STATUS_CHANGED:
        const statusEvent = event as StatusChangedEvent
        return {
          oldStatus: statusEvent.oldStatus,
          newStatus: statusEvent.newStatus,
          status: statusEvent.newStatus,
        }
      case LobbyEventType.GAME_STARTED:
        const gameEvent = event as GameStartedEvent
        return {
          gameUuid: gameEvent.gameUuid,
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
      LobbyEventType.PLAYER_LEFT,
    ].includes(eventType)
  }
}
