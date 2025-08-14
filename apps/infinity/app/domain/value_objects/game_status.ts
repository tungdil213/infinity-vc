export enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ARCHIVED = 'ARCHIVED',
}

export const GAME_STATUS_DESCRIPTIONS = {
  [GameStatus.IN_PROGRESS]: 'Partie en cours',
  [GameStatus.PAUSED]: 'Partie en pause',
  [GameStatus.FINISHED]: 'Partie terminée',
  [GameStatus.ARCHIVED]: 'Partie archivée',
} as const

export type GameStatusType = keyof typeof GameStatus
