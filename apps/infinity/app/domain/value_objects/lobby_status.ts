export enum LobbyStatus {
  OPEN = 'OPEN', // Lobby created, accepts players
  WAITING = 'WAITING', // 1 player, waiting for others
  READY = 'READY', // 2-3 players, can start
  FULL = 'FULL', // 4 players, full
  STARTING = 'STARTING', // Starting in progress
}

export const LOBBY_STATUS_DESCRIPTIONS = {
  [LobbyStatus.OPEN]: 'Open lobby - waiting for players',
  [LobbyStatus.WAITING]: 'Waiting for more players',
  [LobbyStatus.READY]: 'Ready to start (2-3 players)',
  [LobbyStatus.FULL]: 'Full lobby (4 players)',
  [LobbyStatus.STARTING]: 'Game startup in progress',
} as const

export type LobbyStatusType = keyof typeof LobbyStatus
