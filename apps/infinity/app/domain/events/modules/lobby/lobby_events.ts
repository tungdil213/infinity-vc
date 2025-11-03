import { ModuleEvent, ModuleEventFactory } from '../../base/module_event.js'
import type { PlayerInterface } from '#domain/interfaces/player_interface'

/**
 * Types d'événements pour le module lobby
 */
export const LOBBY_EVENT_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  PLAYER_JOINED: 'player.joined',
  PLAYER_LEFT: 'player.left',
  STATUS_CHANGED: 'status.changed',
  GAME_STARTED: 'game.started',
} as const

/**
 * Données pour l'événement de création de lobby
 */
export interface LobbyCreatedData {
  lobbyUuid: string
  name: string
  maxPlayers: number
  isPrivate: boolean
  createdBy: string
  creator: PlayerInterface
}

/**
 * Données pour l'événement de joueur qui rejoint
 */
export interface LobbyPlayerJoinedData {
  lobbyUuid: string
  player: PlayerInterface
  lobbyState: {
    currentPlayers: number
    maxPlayers: number
    canStart: boolean
    status: string
    players: PlayerInterface[]
  }
}

/**
 * Données pour l'événement de joueur qui quitte
 */
export interface LobbyPlayerLeftData {
  lobbyUuid: string
  player: PlayerInterface
  lobbyState: {
    currentPlayers: number
    maxPlayers: number
    canStart: boolean
    status: string
    players: PlayerInterface[]
  }
}

/**
 * Données pour l'événement de changement de statut
 */
export interface LobbyStatusChangedData {
  lobbyUuid: string
  oldStatus: string
  newStatus: string
}

/**
 * Données pour l'événement de suppression
 */
export interface LobbyDeletedData {
  lobbyUuid: string
  reason: string
}

/**
 * Données pour l'événement de démarrage de partie
 */
export interface LobbyGameStartedData {
  lobbyUuid: string
  gameUuid: string
  players: PlayerInterface[]
}

/**
 * Factory pour créer les événements du module lobby
 */
export class LobbyEventFactory {
  static created(data: LobbyCreatedData, userUuid?: string): ModuleEvent<LobbyCreatedData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.CREATED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'creation'],
    })
  }

  static playerJoined(
    data: LobbyPlayerJoinedData,
    userUuid?: string
  ): ModuleEvent<LobbyPlayerJoinedData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.PLAYER_JOINED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'player', 'join'],
    })
  }

  static playerLeft(
    data: LobbyPlayerLeftData,
    userUuid?: string
  ): ModuleEvent<LobbyPlayerLeftData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.PLAYER_LEFT, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'player', 'leave'],
    })
  }

  static statusChanged(
    data: LobbyStatusChangedData,
    userUuid?: string
  ): ModuleEvent<LobbyStatusChangedData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.STATUS_CHANGED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'status'],
    })
  }

  static deleted(data: LobbyDeletedData, userUuid?: string): ModuleEvent<LobbyDeletedData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.DELETED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'deletion'],
    })
  }

  static gameStarted(
    data: LobbyGameStartedData,
    userUuid?: string
  ): ModuleEvent<LobbyGameStartedData> {
    return ModuleEventFactory.create('lobby', LOBBY_EVENT_TYPES.GAME_STARTED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['lobby', 'game', 'start'],
    })
  }
}
