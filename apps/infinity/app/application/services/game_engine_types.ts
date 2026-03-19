import type { IAction, IGameEngine, IGameState } from '@infinity.dev/game-engine/core'

export interface GameReplaySnapshotPlayer {
  id: string
  name: string
  isActive: boolean
  isEliminated: boolean
  isProtected: boolean
  handCount: number
  tokensOfAffection: number
}

export interface GameReplaySnapshot {
  phase: string
  round: number
  turn: number
  isFinished: boolean
  winnerId: string | null
  currentPlayerId: string | null
  players: GameReplaySnapshotPlayer[]
  scores?: Record<string, number>
  roundChoices?: Record<string, string>
  rounds?: Array<{
    round: number
    winnerId: string | null
    choices: Record<string, string>
  }>
}

export interface GameReplayStep {
  step: number
  kind: 'initial' | 'action'
  recordedAt: string
  actorId?: string
  actionType?: string
  actionPayload?: Record<string, unknown>
  events: Array<{
    type: string
    payload: unknown
  }>
  snapshot: GameReplaySnapshot
}

export interface GameSession {
  gameId: string
  lobbyId: string
  gameType: string
  engine: IGameEngine
  state: IGameState
  players: Array<{ id: string; name: string; isActive: boolean }>
  createdAt: Date
  timeline?: GameReplayStep[]
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
