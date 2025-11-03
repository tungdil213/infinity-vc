import { ModuleEvent, ModuleEventFactory } from '../../base/module_event.js'

/**
 * Types d'événements pour le module game
 */
export const GAME_EVENT_TYPES = {
  STARTED: 'started',
  STATE_CHANGED: 'state.changed',
  PLAYER_ACTION: 'player.action',
  TURN_CHANGED: 'turn.changed',
  FINISHED: 'finished',
  PAUSED: 'paused',
  RESUMED: 'resumed',
} as const

/**
 * Données pour l'événement de démarrage de jeu
 */
export interface GameStartedData {
  gameUuid: string
  gameType: string
  playerUuids: string[]
  initialState: any
}

/**
 * Données pour l'événement de changement d'état
 */
export interface GameStateChangedData {
  gameUuid: string
  previousState: any
  newState: any
  changedBy?: string
}

/**
 * Données pour l'événement d'action de joueur
 */
export interface GamePlayerActionData {
  gameUuid: string
  playerUuid: string
  action: {
    type: string
    payload: any
  }
  resultingState: any
}

/**
 * Données pour l'événement de changement de tour
 */
export interface GameTurnChangedData {
  gameUuid: string
  previousPlayerUuid: string
  currentPlayerUuid: string
  turnNumber: number
}

/**
 * Données pour l'événement de fin de jeu
 */
export interface GameFinishedData {
  gameUuid: string
  winnerUuid?: string
  finalState: any
  reason: 'completed' | 'abandoned' | 'timeout'
}

/**
 * Factory pour créer les événements du module game
 */
export class GameEventFactory {
  static started(data: GameStartedData, userUuid?: string): ModuleEvent<GameStartedData> {
    return ModuleEventFactory.create('game', GAME_EVENT_TYPES.STARTED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['game', 'start'],
    })
  }

  static stateChanged(
    data: GameStateChangedData,
    userUuid?: string
  ): ModuleEvent<GameStateChangedData> {
    return ModuleEventFactory.create('game', GAME_EVENT_TYPES.STATE_CHANGED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['game', 'state'],
    })
  }

  static playerAction(
    data: GamePlayerActionData,
    userUuid?: string
  ): ModuleEvent<GamePlayerActionData> {
    return ModuleEventFactory.create('game', GAME_EVENT_TYPES.PLAYER_ACTION, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['game', 'action'],
    })
  }

  static turnChanged(
    data: GameTurnChangedData,
    userUuid?: string
  ): ModuleEvent<GameTurnChangedData> {
    return ModuleEventFactory.create('game', GAME_EVENT_TYPES.TURN_CHANGED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['game', 'turn'],
    })
  }

  static finished(data: GameFinishedData, userUuid?: string): ModuleEvent<GameFinishedData> {
    return ModuleEventFactory.create('game', GAME_EVENT_TYPES.FINISHED, data, {
      userContext: userUuid ? { userUuid } : undefined,
      tags: ['game', 'finish'],
    })
  }
}
