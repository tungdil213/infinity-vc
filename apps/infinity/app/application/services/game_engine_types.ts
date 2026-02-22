import type { IAction, IGameEngine, IGameState } from '@infinity.dev/game-engine/core'

export interface GameSession {
  gameId: string
  lobbyId: string
  gameType: string
  engine: IGameEngine
  state: IGameState
  players: Array<{ id: string; name: string; isActive: boolean }>
  createdAt: Date
}

export interface GameActionRequest {
  gameId: string
  playerId: string
  actionType: string
  payload?: {
    cardType?: string
    targetPlayerId?: string
    guessedCard?: string
    move?: string
  }
}

export interface GameActionResponse {
  success: boolean
  newState?: IGameState
  error?: string
  events?: Array<{
    type: string
    payload: unknown
  }>
}

export type GenericAction = IAction<Record<string, unknown>>
