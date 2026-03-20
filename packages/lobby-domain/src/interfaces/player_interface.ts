export interface PlayerInterface {
  uuid: string // UUID de l'utilisateur
  nickName: string // Pseudonyme de jeu
}

export interface PlayerWithStatsInterface extends PlayerInterface {
  gamesPlayed: number
  gamesWon: number
  winRate: number
}
