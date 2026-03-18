import type Player from '#domain/entities/player'

export interface GameActionRequest {
  gameUuid: string
  playerUuid: string
  action: string
  actionData?: Record<string, unknown>
}

export interface GameActionResponse {
  gameState: Record<string, unknown>
  nextPlayer?: Player
  gameFinished?: boolean
  winner?: Player
}

export interface GameActionCard {
  id?: string
  name: string
  value: number
  [key: string]: unknown
}

export interface CardEffectResult {
  eliminated: boolean
  eliminatedPlayer?: string
}
