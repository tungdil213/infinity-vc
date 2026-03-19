import { eventBus } from '#infrastructure/events/event_bus'
import { type HybridLobbyService } from '#application/services/hybrid_lobby_service'
import {
  LobbyCreatedEvent,
  LobbyModerationClosedEvent,
  LobbyUpdatedEvent,
  LobbyDeletedEvent,
} from '#domain/events/lobby_events'
import type Lobby from '#domain/entities/lobby'

/**
 * Service pour gérer les événements liés aux lobbies
 *
 * Ce service publie des événements domain dans l'event bus.
 * L'EventBridge s'occupe automatiquement de la diffusion vers Transmit.
 */
export class LobbyEventService {
  constructor(private hybridLobbyService: HybridLobbyService) {}

  /**
   * Émet un événement de création de lobby
   */
  async emitLobbyCreated(lobby: Lobby): Promise<void> {
    const event = new LobbyCreatedEvent(lobby.uuid, lobby.name, lobby.createdBy, lobby.maxPlayers)
    await eventBus.publish(event)
    console.log(`[LobbyEventService] Published LobbyCreated for ${lobby.uuid}`)
  }

  /**
   * Émet un événement de mise à jour de lobby
   */
  async emitLobbyUpdated(lobby: Lobby): Promise<void> {
    const event = new LobbyUpdatedEvent(
      lobby.uuid,
      lobby.name,
      lobby.playerCount,
      lobby.maxPlayers,
      lobby.status,
      lobby.players
    )
    await eventBus.publish(event)
    console.log(`[LobbyEventService] Published LobbyUpdated for ${lobby.uuid}`)
  }

  /**
   * Émet un événement de suppression de lobby
   */
  async emitLobbyDeleted(lobbyUuid: string, reason: string = 'deleted'): Promise<void> {
    const event = new LobbyDeletedEvent(lobbyUuid, reason)
    await eventBus.publish(event)
    console.log(`[LobbyEventService] Published LobbyDeleted for ${lobbyUuid}`)
  }

  /**
   * Émet un événement de fermeture modération (audit)
   */
  async emitLobbyModerationClosed(args: {
    lobbyUuid: string
    reason: string
    closedByUserUuid: string
    closedByRole: string
  }): Promise<void> {
    const event = new LobbyModerationClosedEvent(
      args.lobbyUuid,
      args.reason,
      args.closedByUserUuid,
      args.closedByRole
    )
    await eventBus.publish(event)
    console.log(
      `[LobbyEventService] Published LobbyModerationClosed for ${args.lobbyUuid} by ${args.closedByUserUuid}`
    )
  }

  /**
   * Récupère et retourne la liste des lobbies disponibles
   */
  async getLobbyList(): Promise<Lobby[]> {
    return this.hybridLobbyService.findAvailableLobbies()
  }

  /**
   * Récupère et retourne les statistiques des lobbies
   */
  async getLobbyStats(): Promise<any> {
    return this.hybridLobbyService.getStats()
  }
}
