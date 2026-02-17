import type {
  LoveLetterActionType,
  LoveLetterEngine,
  LoveLetterState,
} from '../../games/love-letter/index.js'

export interface GameSession {
  gameId: string
  lobbyId: string
  engine: LoveLetterEngine
  state: LoveLetterState
  createdAt: Date
}

export interface GameActionRequest {
  gameId: string
  playerId: string
  actionType: LoveLetterActionType
  payload?: {
    cardType?: string
    targetPlayerId?: string
    guessedCard?: string
  }
}

export interface GameActionResponse {
  success: boolean
  newState?: LoveLetterState
  error?: string
  events?: Array<{
    type: string
    payload: unknown
  }>
}
