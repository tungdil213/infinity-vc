import { eventBus } from '../../infrastructure/events/event_bus.js'

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
    console.log(`[TransmitLobbyService] Published LobbyCreated for ${lobbyUuid}`)
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
    console.log(`[TransmitLobbyService] Published PlayerJoinedLobby for ${lobbyUuid}`)
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
    console.log(`[TransmitLobbyService] Published PlayerLeftLobby for ${lobbyUuid}`)
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
    console.log(`[TransmitLobbyService] Published LobbyStatusChanged for ${lobbyUuid}`)
  }

  /**
   * Notifie qu'une partie a commencé
   */
  notifyGameStarted(lobbyUuid: string, gameUuid: string, lobby: any): void {
    eventBus.publish({
      id: crypto.randomUUID(),
      type: 'GameStarted',
      timestamp: new Date(),
      payload: {
        lobbyUuid,
        gameUuid,
        lobby,
      },
    })
    console.log(`[TransmitLobbyService] Published GameStarted for ${lobbyUuid}`)
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
    console.log(`[TransmitLobbyService] Published LobbyDeleted for ${lobbyUuid}`)
  }
}
