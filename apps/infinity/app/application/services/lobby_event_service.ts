import { eventBus } from '#infrastructure/events/event_bus'
import { sseService } from '#infrastructure/sse/sse_service'
import { HybridLobbyService } from './hybrid_lobby_service.js'
import {
  LobbyCreatedEvent,
  LobbyUpdatedEvent,
  LobbyDeletedEvent,
} from '#domain/events/lobby_events'
import Lobby from '#domain/entities/lobby'

/**
 * Service pour gérer les événements liés aux lobbies et leur diffusion SSE
 */
export class LobbyEventService {
  constructor(private hybridLobbyService: HybridLobbyService) {}

  /**
   * Émet un événement de création de lobby
   */
  async emitLobbyCreated(lobby: Lobby): Promise<void> {
    const event = new LobbyCreatedEvent(lobby.uuid, lobby.name, lobby.createdBy, lobby.maxPlayers)

    // Émettre l'événement domain
    eventBus.emit('LobbyCreated', event)

    // Diffuser via SSE pour mise à jour temps réel des listes
    await sseService.broadcastGlobal({
      type: 'lobby.created',
      data: {
        lobby: {
          uuid: lobby.uuid,
          name: lobby.name,
          status: lobby.status,
          currentPlayers: lobby.playerCount,
          maxPlayers: lobby.maxPlayers,
          isPrivate: lobby.isPrivate,
          hasAvailableSlots: lobby.hasAvailableSlots,
          canStart: lobby.canStart,
          createdBy: lobby.createdBy,
          players: lobby.players,
          createdAt: lobby.createdAt,
        },
      },
    })
  }

  /**
   * Émet un événement de suppression de lobby
   */
  async emitLobbyDeleted(lobbyUuid: string): Promise<void> {
    // Diffuser globalement pour les listes de lobbies
    await sseService.broadcastGlobal({
      type: 'lobby.deleted',
      data: {
        lobbyUuid,
      },
    })
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

    // Émettre l'événement domain
    eventBus.emit('LobbyUpdated', event)

    // Diffuser via SSE
    await sseService.broadcastToLobby(lobby.uuid, {
      type: 'lobby.updated',
      data: {
        lobby: {
          uuid: lobby.uuid,
          name: lobby.name,
          status: lobby.status,
          currentPlayers: lobby.playerCount,
          maxPlayers: lobby.maxPlayers,
          isPrivate: lobby.isPrivate,
          hasAvailableSlots: lobby.hasAvailableSlots,
          canStart: lobby.canStart,
          createdBy: lobby.createdBy,
          players: lobby.players,
          createdAt: lobby.createdAt,
        },
      },
    })

    // Diffuser globalement pour les listes de lobbies
    await sseService.broadcastGlobal({
      type: 'lobby.list.updated',
      data: {
        lobbyUuid: lobby.uuid,
        lobby: {
          uuid: lobby.uuid,
          name: lobby.name,
          status: lobby.status,
          currentPlayers: lobby.playerCount,
          maxPlayers: lobby.maxPlayers,
          isPrivate: lobby.isPrivate,
          hasAvailableSlots: lobby.hasAvailableSlots,
          canStart: lobby.canStart,
          createdBy: lobby.createdBy,
          players: lobby.players,
          createdAt: lobby.createdAt,
        },
      },
    })
  }

  /**
   * Émet un événement de suppression de lobby
   */
  async emitLobbyDeleted(lobbyUuid: string, reason: string = 'deleted'): Promise<void> {
    const event = new LobbyDeletedEvent(lobbyUuid, reason)

    // Émettre l'événement domain
    eventBus.emit('LobbyDeleted', event)

    // Diffuser via SSE
    await sseService.broadcastToLobby(lobbyUuid, {
      type: 'lobby.deleted',
      data: {
        lobbyUuid,
        reason,
      },
    })

    // Diffuser globalement pour les listes de lobbies
    await sseService.broadcastGlobal({
      type: 'lobby.list.removed',
      data: {
        lobbyUuid,
        reason,
      },
    })
  }

  /**
   * Diffuse l'état actuel de tous les lobbies actifs
   */
  async broadcastLobbyList(): Promise<void> {
    try {
      const lobbies = await this.hybridLobbyService.findAvailableLobbies()

      await sseService.broadcastGlobal({
        type: 'lobby.list.full',
        data: {
          lobbies: lobbies.map((lobby) => ({
            uuid: lobby.uuid,
            name: lobby.name,
            status: lobby.status,
            currentPlayers: lobby.playerCount,
            maxPlayers: lobby.maxPlayers,
            isPrivate: lobby.isPrivate,
            hasAvailableSlots: lobby.hasAvailableSlots,
            canStart: lobby.canStart,
            createdBy: lobby.createdBy,
            players: lobby.players,
            createdAt: lobby.createdAt,
          })),
          total: lobbies.length,
        },
      })
    } catch (error) {
      console.error('Error broadcasting lobby list:', error)
    }
  }

  /**
   * Diffuse les statistiques des lobbies
   */
  async broadcastLobbyStats(): Promise<void> {
    try {
      const stats = await this.hybridLobbyService.getStats()

      await sseService.broadcastGlobal({
        type: 'lobby.stats',
        data: stats,
      })
    } catch (error) {
      console.error('Error broadcasting lobby stats:', error)
    }
  }
}
