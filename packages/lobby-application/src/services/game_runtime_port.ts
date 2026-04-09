import type { PlayerInterface } from '@infinity.dev/lobby-domain/interfaces'

export interface RuntimeResult<T> {
  readonly isSuccess: boolean
  readonly isFailure: boolean
  readonly value: T
  readonly error: string
}

export interface GameRuntimePlayerState {
  id?: string
  name?: string
  isActive?: boolean
  isProtected?: boolean
  isEliminated?: boolean
  hand?: unknown[]
}

export interface GameRuntimeState {
  phase?: string
  currentPlayerId?: string | null
  round?: number
  turn?: number
  isFinished?: boolean
  players?: GameRuntimePlayerState[]
  publicDiscards?: string[]
  deck?: unknown[]
  deckCount?: number
  settings?: Record<string, unknown>
}

export interface GameRuntimeSession {
  gameId: string
  state: GameRuntimeState
  timeline?: unknown[]
  createdAt: Date
}

export interface GameRuntimePort {
  createGame(
    lobbyId: string,
    players: PlayerInterface[],
    gameType: string,
    gameSettings?: Record<string, unknown>
  ): Promise<RuntimeResult<GameRuntimeSession>>
}
