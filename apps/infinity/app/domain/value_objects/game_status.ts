export enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  ABANDONED = 'ABANDONED',
  FINISHED = 'FINISHED',
  ARCHIVED = 'ARCHIVED',
}

export const GAME_STATUS_DESCRIPTIONS = {
  [GameStatus.IN_PROGRESS]: 'Game in progress',
  [GameStatus.PAUSED]: 'Game paused',
  [GameStatus.ABANDONED]: 'Game abandoned',
  [GameStatus.FINISHED]: 'Game finished',
  [GameStatus.ARCHIVED]: 'Game archived',
} as const

export type GameStatusType = keyof typeof GameStatus
