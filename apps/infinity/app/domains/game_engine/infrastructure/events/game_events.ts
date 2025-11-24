/**
 * Types d'événements pour le module game
 * Ces constantes sont utilisées comme eventName dans les DomainEvent
 */
export const GAME_EVENT_TYPES = {
  STARTED: 'game.started',
  STATE_CHANGED: 'game.state.changed',
  PLAYER_ACTION: 'game.player.action',
  TURN_CHANGED: 'game.turn.changed',
  FINISHED: 'game.finished',
  PAUSED: 'game.paused',
  RESUMED: 'game.resumed',
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
