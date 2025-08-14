export enum LobbyStatus {
  OPEN = 'OPEN', // Lobby créé, accepte les joueurs
  WAITING = 'WAITING', // 1 joueur, en attente d'autres
  READY = 'READY', // 2-3 joueurs, peut démarrer
  FULL = 'FULL', // 4 joueurs, complet
  STARTING = 'STARTING', // Démarrage en cours
}

export const LOBBY_STATUS_DESCRIPTIONS = {
  [LobbyStatus.OPEN]: 'Lobby ouvert - En attente de joueurs',
  [LobbyStatus.WAITING]: 'En attente de joueurs supplémentaires',
  [LobbyStatus.READY]: 'Prêt à démarrer (2-3 joueurs)',
  [LobbyStatus.FULL]: 'Lobby complet (4 joueurs)',
  [LobbyStatus.STARTING]: 'Démarrage de la partie en cours',
} as const

export type LobbyStatusType = keyof typeof LobbyStatus
