import type {
  GameRendererOptions,
  RendererKind,
  SimultaneousChoiceRendererOptions,
  TurnBasedCardHandRendererOptions,
} from '@infinity.dev/game-engine'
import type { ComponentType, ReactNode } from 'react'

export type {
  GameRendererOptions,
  SimultaneousChoiceRendererOptions,
  TurnBasedCardHandRendererOptions,
}

export type RpsMove = 'rock' | 'paper' | 'scissors'

export interface GamePlayerSummary {
  id: string
  name: string
  isActive?: boolean
  isProtected?: boolean
  isEliminated?: boolean
  handCount?: number
  discardPile?: Array<{ type: string; name: string; value: number }>
  tokensOfAffection?: number
  isCurrentPlayer?: boolean
  isMe?: boolean
}

export interface GameRoundSummary {
  round: number
  winnerId: string | null
  choices: Record<string, string>
}

export interface GameState {
  phase: string
  currentPlayerId: string | null
  round: number
  turn: number
  isFinished: boolean
  winnerId?: string | null
  winnerIds?: string[]
  loserId?: string | null
  myHand?: string[]
  deckCount?: number
  players: GamePlayerSummary[]
  scores?: Record<string, number>
  roundChoices?: Record<string, string>
  rounds?: GameRoundSummary[]
  roundsToWin?: number
}

export interface PlayerViewState {
  playerId: string
  state: GameState
  availableActions: string[]
  isMyTurn: boolean
}

export interface ReplaySnapshotPlayer {
  id: string
  name: string
  isActive: boolean
  isEliminated: boolean
  isProtected: boolean
  handCount: number
  tokensOfAffection: number
}

export interface ReplaySnapshot {
  phase: string
  round: number
  turn: number
  isFinished: boolean
  winnerId: string | null
  currentPlayerId: string | null
  players: ReplaySnapshotPlayer[]
  scores?: Record<string, number>
  roundChoices?: Record<string, string>
  rounds?: GameRoundSummary[]
}

export interface ReplayStep {
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
  snapshot: ReplaySnapshot
}

export interface GameRendererProps {
  gameTitle: string
  rendererOptions?: GameRendererOptions | null
  gameState: PlayerViewState | null
  user: { uuid: string; nickName: string; role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' }
  isFinished: boolean
  isSpectator: boolean
  isConnected: boolean
  isLoading: boolean
  notifications: string[]
  replayTimeline: ReplayStep[]
  replayCursor: number
  isReplayPinnedToLatest: boolean
  activeReplayStep: ReplayStep | null
  canViewDebugPayload: boolean
  myHand: string[]
  selectedCard: string | null
  selectedTarget: string | null
  selectedGuess: string | null
  lastSubmittedMove: RpsMove | null
  isMyTurn: boolean
  phase: string
  canDraw: boolean
  canPlay: boolean
  canSubmitMove: boolean
  onLeave: () => void
  onDraw: () => void
  onSubmitMove: (move: RpsMove) => void
  onPlayCard: () => void
  onSelectCard: (cardType: string | null) => void
  onSelectTarget: (playerId: string) => void
  onSelectGuess: (cardType: string) => void
  moveReplayCursor: (nextCursor: number) => void
  getPlayerLabel: (playerId?: string | null) => string
  describeReplayEvent: (event: { type: string; payload: unknown }) => string
  formatDebugPayload: (payload: unknown) => string
  renderReplayDiff: () => ReactNode
}

export interface FrontendGameRendererDefinition {
  kind: RendererKind
  pollingIntervalMs: number
  Component: ComponentType<GameRendererProps>
}
