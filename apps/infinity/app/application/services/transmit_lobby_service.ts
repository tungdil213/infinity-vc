import { eventBus } from '#infrastructure/events/event_bus'
import logger from '@adonisjs/core/services/logger'

/**
 * Service de notification pour les événements de lobby
 *
 * Ce service publie des événements dans l'event bus.
 * L'EventBridge s'occupe de diffuser ces événements vers Transmit.
 */
export class TransmitLobbyService {
  /**
   * Notifie qu'un lobby a été créé
   */
  notifyLobbyCreated(lobbyUuid: string, lobby: any): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'LobbyCreated',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        lobby,
      },
    })
    logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published LobbyCreated')
  }

  /**
   * Notifie qu'un joueur a rejoint un lobby
   */
  notifyPlayerJoined(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobby: any
  ): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlayerJoinedLobby',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        player,
        lobby,
        playerCount: lobby?.currentPlayers || 0,
      },
    })
    logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published PlayerJoinedLobby')

    this.notifyLobbyOwnerWhenFull(lobbyUuid, player, lobby)
  }

  /**
   * Notifie qu'un joueur a quitté un lobby
   */
  notifyPlayerLeft(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobby: any
  ): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'PlayerLeftLobby',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        player,
        lobby,
        playerCount: lobby?.currentPlayers || 0,
      },
    })
    logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published PlayerLeftLobby')
  }

  /**
   * Notifie qu'un statut de lobby a changé
   */
  notifyStatusChanged(lobbyUuid: string, oldStatus: string, newStatus: string, lobby: any): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'LobbyStatusChanged',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        oldStatus,
        newStatus,
        lobby,
      },
    })
    logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published LobbyStatusChanged')
  }

  /**
   * Notifie qu'une partie a commencé
   */
  async notifyGameStarted(lobbyUuid: string, gameUuid: string, lobby: any): Promise<void> {
    try {
      await eventBus.publish({
        id: crypto.randomUUID(),
        type: 'GameStarted',
        timestamp: new Date(),
        payload: {
          lobbyUuid,
          gameUuid,
          gameId: gameUuid,
          lobby,
        },
      })
      logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published GameStarted')
    } catch (error) {
      logger.error({ lobbyUuid, error }, '[TransmitLobbyService] Failed to publish GameStarted')
    }
  }

  /**
   * Notifie qu'un lobby a été supprimé
   */
  notifyLobbyDeleted(lobbyUuid: string, lobby: any): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'LobbyDeleted',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        lobby,
      },
    })
    logger.debug({ lobbyUuid }, '[TransmitLobbyService] Published LobbyDeleted')
  }

  private notifyLobbyOwnerWhenFull(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobby: any
  ): void {
    const ownerUuid = typeof lobby?.createdBy === 'string' ? lobby.createdBy : null
    const lobbyName = typeof lobby?.name === 'string' ? lobby.name : 'Lobby'
    const currentPlayers =
      typeof lobby?.currentPlayers === 'number' ? Math.max(0, lobby.currentPlayers) : null
    const maxPlayers = typeof lobby?.maxPlayers === 'number' ? Math.max(0, lobby.maxPlayers) : null

    const isLobbyFull =
      typeof currentPlayers === 'number' &&
      typeof maxPlayers === 'number' &&
      maxPlayers > 0 &&
      currentPlayers >= maxPlayers

    if (!ownerUuid || ownerUuid === player.uuid || !isLobbyFull) {
      return
    }

    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'LobbyOwnerLobbyFull',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        ownerUuid,
        lobbyName,
        currentPlayers,
        maxPlayers,
        triggeredBy: player,
      },
    })

    logger.debug(
      { lobbyUuid, ownerUuid, currentPlayers, maxPlayers },
      '[TransmitLobbyService] Published LobbyOwnerLobbyFull'
    )
  }
}
