import { DomainEvent, DomainEventFactory } from '../base/domain_event.js'

/**
 * Événements du domaine Lobby pour l'architecture Event-Driven
 * Remplacement des anciens events avec une structure plus riche et typée
 */

/**
 * Événement de création de lobby
 */
export interface LobbyCreatedDomainEvent extends DomainEvent {
  type: 'lobby.created'
  data: {
    lobbyUuid: string
    name: string
    maxPlayers: number
    isPrivate: boolean
    createdBy: string
    creator: {
      uuid: string
      nickName: string
    }
  }
}

/**
 * Événement quand un joueur rejoint un lobby
 */
export interface PlayerJoinedLobbyDomainEvent extends DomainEvent {
  type: 'lobby.player.joined'
  data: {
    lobbyUuid: string
    player: {
      uuid: string
      nickName: string
    }
    lobbyState: {
      currentPlayers: number
      maxPlayers: number
      canStart: boolean
      status: string
      players: Array<{
        // ✅ ÉTAT COMPLET
        uuid: string
        nickName: string
      }>
    }
  }
}

/**
 * Événement quand un joueur quitte un lobby
 */
export interface PlayerLeftLobbyDomainEvent extends DomainEvent {
  type: 'lobby.player.left'
  data: {
    lobbyUuid: string
    player: {
      uuid: string
      nickName: string
    }
    lobbyState: {
      currentPlayers: number
      maxPlayers: number
      canStart: boolean
      status: string
      players: Array<{
        // ✅ ÉTAT COMPLET
        uuid: string
        nickName: string
      }>
    }
    wasDeleted: boolean
  }
}

/**
 * Événement de changement de statut du lobby
 */
export interface LobbyStatusChangedDomainEvent extends DomainEvent {
  type: 'lobby.status.changed'
  data: {
    lobbyUuid: string
    oldStatus: string
    newStatus: string
    changedBy: string
    reason?: string
  }
}

/**
 * Événement de suppression de lobby
 */
export interface LobbyDeletedDomainEvent extends DomainEvent {
  type: 'lobby.deleted'
  data: {
    lobbyUuid: string
    reason: 'empty' | 'manual' | 'timeout'
    deletedBy?: string
  }
}

/**
 * Événement de démarrage de partie
 */
export interface GameStartedFromLobbyDomainEvent extends DomainEvent {
  type: 'lobby.game.started'
  data: {
    lobbyUuid: string
    gameUuid: string
    initiatedBy: string
    players: Array<{
      uuid: string
      nickName: string
    }>
  }
}

/**
 * Union type pour tous les événements lobby
 */
export type LobbyDomainEvent =
  | LobbyCreatedDomainEvent
  | PlayerJoinedLobbyDomainEvent
  | PlayerLeftLobbyDomainEvent
  | LobbyStatusChangedDomainEvent
  | LobbyDeletedDomainEvent
  | GameStartedFromLobbyDomainEvent

/**
 * Factory pour créer les événements du domaine Lobby
 * Centralise la création avec les bonnes métadonnées
 */
export class LobbyEventFactory {
  /**
   * Créer un événement de création de lobby
   */
  static lobbyCreated(
    lobbyUuid: string,
    name: string,
    maxPlayers: number,
    isPrivate: boolean,
    creator: { uuid: string; nickName: string },
    userContext?: { userUuid: string; sessionId?: string }
  ): LobbyCreatedDomainEvent {
    return DomainEventFactory.create(
      'lobby.created',
      {
        lobbyUuid,
        name,
        maxPlayers,
        isPrivate,
        createdBy: creator.uuid,
        creator,
      },
      {
        userContext,
        tags: ['lobby', 'creation', isPrivate ? 'private' : 'public'],
      }
    ) as LobbyCreatedDomainEvent
  }

  /**
   * Créer un événement de joueur qui rejoint
   */
  static playerJoined(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobbyState: {
      currentPlayers: number
      maxPlayers: number
      canStart: boolean
      status: string
      players: Array<{ uuid: string; nickName: string }>
    },
    userContext?: { userUuid: string; sessionId?: string }
  ): PlayerJoinedLobbyDomainEvent {
    return DomainEventFactory.create(
      'lobby.player.joined',
      {
        lobbyUuid,
        player,
        lobbyState,
      },
      {
        userContext,
        tags: ['lobby', 'player', 'join'],
      }
    ) as PlayerJoinedLobbyDomainEvent
  }

  /**
   * Créer un événement de joueur qui quitte
   */
  static playerLeft(
    lobbyUuid: string,
    player: { uuid: string; nickName: string },
    lobbyState: {
      currentPlayers: number
      maxPlayers: number
      canStart: boolean
      status: string
      players: Array<{ uuid: string; nickName: string }>
    },
    wasDeleted: boolean,
    userContext?: { userUuid: string; sessionId?: string }
  ): PlayerLeftLobbyDomainEvent {
    return DomainEventFactory.create(
      'lobby.player.left',
      {
        lobbyUuid,
        player,
        lobbyState,
        wasDeleted,
      },
      {
        userContext,
        tags: ['lobby', 'player', 'leave', wasDeleted ? 'deleted' : 'active'],
      }
    ) as PlayerLeftLobbyDomainEvent
  }

  /**
   * Créer un événement de changement de statut
   */
  static statusChanged(
    lobbyUuid: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    reason?: string,
    userContext?: { userUuid: string; sessionId?: string }
  ): LobbyStatusChangedDomainEvent {
    return DomainEventFactory.create(
      'lobby.status.changed',
      {
        lobbyUuid,
        oldStatus,
        newStatus,
        changedBy,
        reason,
      },
      {
        userContext,
        tags: ['lobby', 'status', oldStatus, newStatus],
      }
    ) as LobbyStatusChangedDomainEvent
  }

  /**
   * Créer un événement de suppression de lobby
   */
  static lobbyDeleted(
    lobbyUuid: string,
    reason: 'empty' | 'manual' | 'timeout',
    deletedBy?: string,
    userContext?: { userUuid: string; sessionId?: string }
  ): LobbyDeletedDomainEvent {
    return DomainEventFactory.create(
      'lobby.deleted',
      {
        lobbyUuid,
        reason,
        deletedBy,
      },
      {
        userContext,
        tags: ['lobby', 'deletion', reason],
      }
    ) as LobbyDeletedDomainEvent
  }

  /**
   * Créer un événement de démarrage de partie
   */
  static gameStarted(
    lobbyUuid: string,
    gameUuid: string,
    initiatedBy: string,
    players: Array<{ uuid: string; nickName: string }>,
    userContext?: { userUuid: string; sessionId?: string }
  ): GameStartedFromLobbyDomainEvent {
    return DomainEventFactory.create(
      'lobby.game.started',
      {
        lobbyUuid,
        gameUuid,
        initiatedBy,
        players,
      },
      {
        userContext,
        tags: ['lobby', 'game', 'start'],
      }
    ) as GameStartedFromLobbyDomainEvent
  }
}
