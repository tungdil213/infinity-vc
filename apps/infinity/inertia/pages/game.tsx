import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { Alert, AlertDescription } from '@infinity.dev/ui/primitives/alert'
import { useTransmit } from '../contexts/TransmitContext'
import Layout from '../layouts/layout'

const CARD_INFO: Record<
  string,
  { name: string; value: number; description: string; color: string }
> = {
  guard: {
    name: 'Guard',
    value: 1,
    description: 'Guess a card. If correct, target eliminated.',
    color: 'bg-red-500',
  },
  priest: {
    name: 'Priest',
    value: 2,
    description: "Look at another player's hand.",
    color: 'bg-blue-500',
  },
  baron: {
    name: 'Baron',
    value: 3,
    description: 'Compare hands. Lower value eliminated.',
    color: 'bg-green-500',
  },
  handmaid: {
    name: 'Handmaid',
    value: 4,
    description: 'Protected until your next turn.',
    color: 'bg-yellow-500',
  },
  prince: {
    name: 'Prince',
    value: 5,
    description: 'Target discards and draws new card.',
    color: 'bg-purple-500',
  },
  king: {
    name: 'King',
    value: 6,
    description: 'Trade hands with another player.',
    color: 'bg-orange-500',
  },
  countess: {
    name: 'Countess',
    value: 7,
    description: 'Must discard if you have King/Prince.',
    color: 'bg-pink-500',
  },
  princess: {
    name: 'Princess',
    value: 8,
    description: 'If discarded, you are eliminated.',
    color: 'bg-indigo-500',
  },
}

const GUESSABLE_CARDS = ['priest', 'baron', 'handmaid', 'prince', 'king', 'countess', 'princess']
const TARGET_CARDS = ['guard', 'priest', 'baron', 'prince', 'king']
type RpsMove = 'rock' | 'paper' | 'scissors'
const RPS_MOVE_META: Record<RpsMove, { label: string; picto: string }> = {
  rock: { label: 'Rock', picto: '✊' },
  paper: { label: 'Paper', picto: '✋' },
  scissors: { label: 'Scissors', picto: '✌' },
}

const formatRpsMove = (move: string | undefined) => {
  if (!move || !Object.keys(RPS_MOVE_META).includes(move)) {
    return 'Hidden'
  }

  const typedMove = move as RpsMove
  return `${RPS_MOVE_META[typedMove].picto} ${RPS_MOVE_META[typedMove].label}`
}

interface LoveLetterPlayer {
  id: string
  name: string
  isActive: boolean
  isProtected: boolean
  isEliminated: boolean
  handCount: number
  discardPile: Array<{ type: string; name: string; value: number }>
  tokensOfAffection: number
  isCurrentPlayer: boolean
  isMe: boolean
}

interface GameState {
  phase: string
  currentPlayerId: string | null
  round: number
  turn: number
  isFinished: boolean
  winnerId?: string | null
  winnerIds?: string[]
  loserId?: string | null
  myHand?: string[]
  deckCount: number
  players: LoveLetterPlayer[]
}

interface PlayerViewState {
  playerId: string
  state: GameState
  availableActions: string[]
  isMyTurn: boolean
}

interface ReplaySnapshotPlayer {
  id: string
  name: string
  isActive: boolean
  isEliminated: boolean
  isProtected: boolean
  handCount: number
  tokensOfAffection: number
}

interface ReplaySnapshot {
  phase: string
  round: number
  turn: number
  isFinished: boolean
  winnerId: string | null
  currentPlayerId: string | null
  players: ReplaySnapshotPlayer[]
  scores?: Record<string, number>
  roundChoices?: Record<string, string>
  rounds?: Array<{
    round: number
    winnerId: string | null
    choices: Record<string, string>
  }>
}

interface ReplayStep {
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

interface GameProps {
  gameId: string
  gameType: string
  playerView: PlayerViewState | null
  availableActions: string[]
  replayTimeline?: ReplayStep[]
  user: { uuid: string; nickName: string; role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' }
  isFinished: boolean
  isSpectator?: boolean
  game?: unknown
}

function Card({
  cardType,
  onClick,
  selected,
  disabled,
  size = 'normal',
}: {
  cardType: string
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  size?: 'small' | 'normal'
}) {
  const card = CARD_INFO[cardType]
  if (!card) return null
  const sizeClasses = { small: 'w-12 h-16 text-xs', normal: 'w-20 h-28 text-sm' }
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${sizeClasses[size]} ${card.color} rounded-lg shadow-lg flex flex-col items-center justify-between p-2 text-white font-bold
        ${onClick && !disabled ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${disabled ? 'opacity-50' : ''}`}
    >
      <span className="text-lg">{card.value}</span>
      <span className="text-center leading-tight">{card.name}</span>
    </div>
  )
}

function PlayerCard({
  player,
  isTarget,
  onSelect,
  canTarget,
}: {
  player: LoveLetterPlayer
  isTarget: boolean
  onSelect: () => void
  canTarget: boolean
}) {
  return (
    <div
      onClick={canTarget && !player.isProtected && !player.isEliminated ? onSelect : undefined}
      className={`p-4 rounded-lg border-2 transition-all
        ${player.isMe ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        ${player.isCurrentPlayer ? 'ring-2 ring-green-400' : ''}
        ${player.isEliminated ? 'opacity-50 bg-gray-100' : ''}
        ${player.isProtected ? 'border-yellow-400' : ''}
        ${isTarget ? 'ring-4 ring-red-400 scale-105' : ''}
        ${canTarget && !player.isProtected && !player.isEliminated ? 'cursor-pointer hover:shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${player.isEliminated ? 'bg-gray-400' : 'bg-linear-to-br from-purple-500 to-pink-500'}`}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <div className="flex gap-1 text-xs">
              {player.isMe && <span className="px-1 bg-blue-100 text-blue-700 rounded">You</span>}
              {player.isCurrentPlayer && (
                <span className="px-1 bg-green-100 text-green-700 rounded">Turn</span>
              )}
              {player.isProtected && (
                <span className="px-1 bg-yellow-100 text-yellow-700 rounded">Protected</span>
              )}
              {player.isEliminated && (
                <span className="px-1 bg-red-100 text-red-700 rounded">Out</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg">Tokens: {player.tokensOfAffection}</div>
          <div className="text-xs text-gray-500">{player.handCount} cards</div>
        </div>
      </div>
      {player.discardPile && player.discardPile.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Discarded:</div>
          <div className="flex gap-1 flex-wrap">
            {player.discardPile.map((c, i) => (
              <Card key={i} cardType={c.type} size="small" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Game({
  gameId,
  gameType,
  playerView,
  availableActions: initialActions,
  replayTimeline: initialReplayTimeline = [],
  user,
  isFinished,
  isSpectator = false,
}: GameProps) {
  const [gameState, setGameState] = useState<PlayerViewState | null>(playerView)
  const [availableActions, setAvailableActions] = useState<string[]>(initialActions || [])
  const [lastSubmittedMove, setLastSubmittedMove] = useState<RpsMove | null>(null)
  const [myHand, setMyHand] = useState<string[]>(
    Array.isArray(playerView?.state?.myHand) ? playerView.state.myHand : []
  )
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [replayTimeline, setReplayTimeline] = useState<ReplayStep[]>(initialReplayTimeline)
  const [replayCursor, setReplayCursor] = useState<number>(
    Math.max(initialReplayTimeline.length - 1, 0)
  )
  const [isReplayPinnedToLatest, setIsReplayPinnedToLatest] = useState(true)
  const canViewDebugPayload = user.role === 'ADMIN'

  const { isConnected, subscribeToGame } = useTransmit()

  const addNotification = useCallback((msg: string) => {
    setNotifications((prev) => [...prev, msg])
    setTimeout(() => setNotifications((prev) => prev.slice(1)), 5000)
  }, [])

  const moveReplayCursor = useCallback(
    (nextCursor: number) => {
      if (replayTimeline.length === 0) {
        setReplayCursor(0)
        return
      }

      const lastIndex = replayTimeline.length - 1
      const clampedCursor = Math.max(0, Math.min(nextCursor, lastIndex))
      setReplayCursor(clampedCursor)
      setIsReplayPinnedToLatest(clampedCursor === lastIndex)
    },
    [replayTimeline.length]
  )

  useEffect(() => {
    if (replayTimeline.length === 0) {
      setReplayCursor(0)
      return
    }

    const lastIndex = replayTimeline.length - 1
    setReplayCursor((current) => {
      if (isReplayPinnedToLatest) {
        return lastIndex
      }
      return Math.min(current, lastIndex)
    })
  }, [replayTimeline, isReplayPinnedToLatest])

  const activeReplayStep =
    replayTimeline.length > 0
      ? replayTimeline[Math.max(0, Math.min(replayCursor, replayTimeline.length - 1))]
      : null
  const previousReplayStep =
    replayTimeline.length > 0 && replayCursor > 0 ? replayTimeline[replayCursor - 1] : null

  const replayDiff = useMemo(() => {
    if (!activeReplayStep) {
      return null
    }

    const currentSnapshot = activeReplayStep.snapshot
    const previousSnapshot = previousReplayStep?.snapshot
    if (!previousSnapshot) {
      return {
        hasPreviousStep: false,
        previousPhase: '',
        currentPhase: currentSnapshot.phase,
        phaseChanged: false,
        previousCurrentPlayerId: null as string | null,
        currentCurrentPlayerId: currentSnapshot.currentPlayerId,
        currentPlayerChanged: false,
        previousFinished: false,
        currentFinished: currentSnapshot.isFinished,
        finishedChanged: false,
        scoreChanges: [] as Array<{
          playerId: string
          previousScore: number
          currentScore: number
          delta: number
        }>,
        scoreDeltaByPlayerId: {} as Record<string, number>,
      }
    }

    const previousScores = previousSnapshot.scores ?? {}
    const currentScores = currentSnapshot.scores ?? {}
    const scorePlayerIds = Array.from(
      new Set([...Object.keys(previousScores), ...Object.keys(currentScores)])
    )
    const scoreChanges = scorePlayerIds
      .map((playerId) => {
        const previousScore = Number(previousScores[playerId] ?? 0)
        const currentScore = Number(currentScores[playerId] ?? 0)
        const delta = currentScore - previousScore
        return {
          playerId,
          previousScore,
          currentScore,
          delta,
        }
      })
      .filter((change) => change.delta !== 0)

    const scoreDeltaByPlayerId = scoreChanges.reduce<Record<string, number>>((acc, change) => {
      acc[change.playerId] = change.delta
      return acc
    }, {})

    return {
      hasPreviousStep: true,
      previousPhase: previousSnapshot.phase,
      currentPhase: currentSnapshot.phase,
      phaseChanged: previousSnapshot.phase !== currentSnapshot.phase,
      previousCurrentPlayerId: previousSnapshot.currentPlayerId,
      currentCurrentPlayerId: currentSnapshot.currentPlayerId,
      currentPlayerChanged: previousSnapshot.currentPlayerId !== currentSnapshot.currentPlayerId,
      previousFinished: previousSnapshot.isFinished,
      currentFinished: currentSnapshot.isFinished,
      finishedChanged: previousSnapshot.isFinished !== currentSnapshot.isFinished,
      scoreChanges,
      scoreDeltaByPlayerId,
    }
  }, [activeReplayStep, previousReplayStep])

  const getPlayerLabel = useCallback(
    (playerId?: string | null) => {
      if (!playerId) {
        return 'Unknown player'
      }

      if (playerId === user.uuid) {
        return 'You'
      }

      const replayPlayer = activeReplayStep?.snapshot.players.find(
        (player) => player.id === playerId
      )
      if (replayPlayer?.name) {
        return replayPlayer.name
      }

      const currentPlayer = gameState?.state?.players.find((player) => player.id === playerId)
      if (currentPlayer?.name) {
        return currentPlayer.name
      }

      return playerId
    },
    [activeReplayStep?.snapshot.players, gameState?.state?.players, user.uuid]
  )

  const describeReplayEvent = useCallback(
    (event: { type: string; payload: unknown }) => {
      const payload = event.payload
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return event.type
      }

      const record = payload as Record<string, unknown>
      const actorId =
        typeof record.playerId === 'string'
          ? record.playerId
          : typeof record.actorId === 'string'
            ? record.actorId
            : undefined
      const targetId =
        typeof record.targetPlayerId === 'string'
          ? record.targetPlayerId
          : typeof record.opponentId === 'string'
            ? record.opponentId
            : undefined

      const segments = [event.type]
      if (actorId) {
        segments.push(`by ${getPlayerLabel(actorId)}`)
      }
      if (targetId) {
        segments.push(`targeting ${getPlayerLabel(targetId)}`)
      }

      return segments.join(' ')
    },
    [getPlayerLabel]
  )

  const formatDebugPayload = useCallback((payload: unknown) => {
    if (payload === undefined) {
      return 'No debug payload'
    }

    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return 'Unable to render payload'
    }
  }, [])

  const renderReplayDiff = useCallback(() => {
    if (!activeReplayStep || !replayDiff) {
      return null
    }

    return (
      <div className="rounded-base border-2 border-amber-300 bg-amber-50 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Step Diff</p>
        {!replayDiff.hasPreviousStep ? (
          <p className="mt-2 text-xs text-amber-900">
            Initial snapshot: no previous step to compare.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={replayDiff.phaseChanged ? 'default' : 'secondary'}>
                Phase: {replayDiff.previousPhase} {'>'} {replayDiff.currentPhase}
              </Badge>
              <Badge variant={replayDiff.currentPlayerChanged ? 'default' : 'secondary'}>
                Active:{' '}
                {replayDiff.currentPlayerChanged
                  ? `${getPlayerLabel(replayDiff.previousCurrentPlayerId)} -> ${getPlayerLabel(replayDiff.currentCurrentPlayerId)}`
                  : getPlayerLabel(replayDiff.currentCurrentPlayerId)}
              </Badge>
              <Badge variant={replayDiff.finishedChanged ? 'default' : 'secondary'}>
                Status: {replayDiff.previousFinished ? 'Finished' : 'Running'} {'>'}{' '}
                {replayDiff.currentFinished ? 'Finished' : 'Running'}
              </Badge>
            </div>

            {replayDiff.scoreChanges.length > 0 ? (
              <div className="space-y-1">
                {replayDiff.scoreChanges.map((change) => (
                  <p key={`diff-score-${change.playerId}`} className="text-xs text-amber-900">
                    {getPlayerLabel(change.playerId)}: {change.previousScore} {'>'}{' '}
                    {change.currentScore} ({change.delta > 0 ? `+${change.delta}` : change.delta})
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-900">No score change on this step.</p>
            )}
          </div>
        )}
      </div>
    )
  }, [activeReplayStep, getPlayerLabel, replayDiff])

  const refreshGameState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/games/${gameId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setGameState(data.playerView)
        const nextAvailableActions = data.availableActions || []
        setAvailableActions(nextAvailableActions)
        if (nextAvailableActions.includes('submit_move')) {
          setLastSubmittedMove(null)
        }
        if (Array.isArray(data.playerView?.state?.myHand)) {
          setMyHand(data.playerView.state.myHand)
        }
        if (Array.isArray(data.replayTimeline)) {
          setReplayTimeline(data.replayTimeline as ReplayStep[])
        }
      }
    } catch {
      return
    }
  }, [gameId])

  const handleDraw = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const res = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'draw' }),
      })
      const result = await res.json()
      if (result.success) {
        addNotification('Card drawn!')
        await refreshGameState()
      } else addNotification(`Error: ${result.error}`)
    } catch {
      addNotification('Failed to draw')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitMove = async (move: RpsMove) => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const res = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ actionType: 'submit_move', move }),
      })

      const result = await res.json()
      if (result.success) {
        setLastSubmittedMove(move)
        addNotification(`Move submitted: ${formatRpsMove(move)}`)
        await refreshGameState()
      } else {
        addNotification(`Error: ${result.error}`)
      }
    } catch {
      addNotification('Failed to submit move')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayCard = async () => {
    if (!selectedCard || isLoading) return
    const needsTarget = TARGET_CARDS.includes(selectedCard) && selectedCard !== 'prince'
    const needsGuess = selectedCard === 'guard'
    if (needsTarget && !selectedTarget) {
      addNotification('Select a target')
      return
    }
    if (needsGuess && !selectedGuess) {
      addNotification('Select card to guess')
      return
    }
    setIsLoading(true)
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken
      }

      const res = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          action: 'play',
          cardType: selectedCard,
          targetPlayerId: selectedTarget,
          guessedCard: selectedGuess,
        }),
      })
      const result = await res.json()
      if (result.success) {
        addNotification(`Played ${CARD_INFO[selectedCard]?.name}!`)
        setSelectedCard(null)
        setSelectedTarget(null)
        setSelectedGuess(null)
        await refreshGameState()
      } else addNotification(`Error: ${result.error}`)
    } catch {
      addNotification('Failed to play')
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time subscription to game events via Transmit
  useEffect(() => {
    if (!isConnected) return

    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      unsubscribe = await subscribeToGame(gameId, () => {
        refreshGameState()
      })
    }

    subscribe().catch(() => undefined)

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [gameId, isConnected, subscribeToGame, refreshGameState])

  useEffect(() => {
    if (!isConnected) return

    refreshGameState().catch(() => undefined)
  }, [isConnected, refreshGameState])

  useEffect(() => {
    const onFocus = () => {
      refreshGameState().catch(() => undefined)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshGameState().catch(() => undefined)
      }
    }

    const pollingIntervalMs = gameType === 'rock-paper-scissors' ? 3000 : 5000
    const intervalId = window.setInterval(() => {
      refreshGameState().catch(() => undefined)
    }, pollingIntervalMs)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [gameType, refreshGameState])

  useEffect(() => {
    refreshGameState()
  }, [refreshGameState])

  if (isFinished || gameState?.state?.isFinished) {
    const finalStateRecord = (gameState?.state ?? {}) as Record<string, unknown>
    const isRpsFinished = gameType === 'rock-paper-scissors'
    const rpsFinalScores = (finalStateRecord.scores as Record<string, number>) ?? {}
    const rpsFinalRounds = (
      Array.isArray(finalStateRecord.rounds) ? finalStateRecord.rounds : []
    ) as Array<{
      round: number
      winnerId: string | null
      choices: Record<string, string>
    }>
    const loveLetterWinnerIds = Array.isArray(finalStateRecord.winnerIds)
      ? finalStateRecord.winnerIds.filter(
          (winnerId): winnerId is string => typeof winnerId === 'string'
        )
      : []
    const loveLetterLoserId =
      typeof finalStateRecord.loserId === 'string' ? finalStateRecord.loserId : null
    const loveLetterLoser = (gameState?.state?.players ?? []).find(
      (player) => player.id === loveLetterLoserId
    )
    const loveLetterWinners = (gameState?.state?.players ?? []).filter((player) =>
      loveLetterWinnerIds.includes(player.id)
    )
    const winner = isRpsFinished
      ? gameState?.state?.players?.find((p) =>
          gameState?.state?.winnerId ? p.id === gameState.state.winnerId : !p.isEliminated
        )
      : loveLetterWinners[0]
    return (
      <Layout>
        <Head title="Game Over" />
        <div className="flex flex-1 items-center justify-center bg-main p-4">
          <UICard className="max-w-2xl w-full text-center">
            <CardHeader>
              <div className="text-6xl mb-4">🎮</div>
              <CardTitle className="text-3xl">Game Over</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xl mb-6">
                {isRpsFinished
                  ? winner?.isMe
                    ? 'You won!'
                    : `${winner?.name} wins!`
                  : loveLetterLoser?.isMe
                    ? 'You lost this round.'
                    : `${loveLetterLoser?.name ?? 'One player'} lost this round.`}
              </p>

              {isRpsFinished && (
                <div className="space-y-4 text-left">
                  <div className="rounded-base border-2 border-border p-3">
                    <p className="font-heading mb-2">Final Score</p>
                    <div className="space-y-1 text-sm">
                      {(gameState?.state?.players ?? []).map((player) => (
                        <div key={player.id} className="flex items-center justify-between">
                          <span>
                            {player.name} {player.isMe ? '(You)' : ''}
                          </span>
                          <span>{rpsFinalScores[player.id] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-base border-2 border-border p-3">
                    <p className="font-heading mb-2">Rounds Recap</p>
                    <div className="space-y-1 text-sm">
                      {rpsFinalRounds.length === 0 ? (
                        <p className="text-muted-foreground">No rounds recorded.</p>
                      ) : (
                        rpsFinalRounds.map((round, index) => (
                          <div
                            key={`final-round-${round.round}-${round.winnerId ?? 'draw'}-${index}`}
                            className="flex items-center justify-between"
                          >
                            <span>Round {round.round}</span>
                            <span>
                              {round.winnerId === null
                                ? 'Draw'
                                : round.winnerId === user.uuid
                                  ? 'Won by you'
                                  : 'Won by opponent'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!isRpsFinished && (
                <div className="space-y-4 text-left">
                  <div className="rounded-base border-2 border-border p-3">
                    <p className="font-heading mb-2">Round Result</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Loser</span>
                        <span>
                          {loveLetterLoser?.isMe ? 'You' : (loveLetterLoser?.name ?? 'Unknown')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Winners</span>
                        <span>
                          {loveLetterWinners
                            .map((player) => (player.isMe ? 'You' : player.name))
                            .join(', ') || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {replayTimeline.length > 0 && activeReplayStep && (
                <div className="space-y-3 text-left">
                  <div className="rounded-base border-2 border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-heading">Replay Timeline</p>
                      <Badge variant="secondary">
                        Step {replayCursor + 1} / {replayTimeline.length}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayCursor - 1)}
                        disabled={replayCursor <= 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayCursor + 1)}
                        disabled={replayCursor >= replayTimeline.length - 1}
                      >
                        Next
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayTimeline.length - 1)}
                        disabled={isReplayPinnedToLatest}
                      >
                        Live
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-base border-2 border-border p-3 text-sm">
                    <p className="font-semibold">
                      {activeReplayStep.kind === 'initial'
                        ? 'Game started'
                        : `${getPlayerLabel(activeReplayStep.actorId)} played ${activeReplayStep.actionType ?? 'action'}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activeReplayStep.recordedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Phase: {activeReplayStep.snapshot.phase} | Round:{' '}
                      {activeReplayStep.snapshot.round} | Turn: {activeReplayStep.snapshot.turn}
                    </p>
                  </div>

                  {renderReplayDiff()}
                </div>
              )}

              <Button onClick={() => (window.location.href = '/lobbies')} className="w-full">
                Back to Lobbies
              </Button>
            </CardContent>
          </UICard>
        </div>
      </Layout>
    )
  }

  const players = gameState?.state?.players || []
  const stateRecord = (gameState?.state ?? {}) as Record<string, unknown>
  const isRpsGame = gameType === 'rock-paper-scissors'
  const gameTitle = isRpsGame ? 'Rock Paper Scissors' : 'Love Letter Infinity Gauntlet'
  const isMyTurn = gameState?.isMyTurn || false
  const phase = gameState?.state?.phase || 'waiting'
  const canDraw = !isSpectator && availableActions.includes('draw_card')
  const canPlay = !isSpectator && availableActions.includes('play_card')
  const canSubmitMove = !isSpectator && availableActions.includes('submit_move')

  if (isRpsGame) {
    const rpsScores = (stateRecord.scores as Record<string, number>) ?? {}
    const rpsRoundChoices = (stateRecord.roundChoices as Record<string, string>) ?? {}
    const rpsRounds = (Array.isArray(stateRecord.rounds) ? stateRecord.rounds : []) as Array<{
      round: number
      winnerId: string | null
      choices: Record<string, string>
    }>
    const roundsToWin = Number(stateRecord.roundsToWin ?? 3)
    const latestRound = rpsRounds.at(-1)
    const latestRoundLabel = latestRound
      ? latestRound.winnerId === null
        ? 'Draw'
        : latestRound.winnerId === user.uuid
          ? 'You won the round'
          : 'You lost the round'
      : null
    const playersWithScores = (players as Array<{ id: string; name: string }>).map((player) => ({
      ...player,
      score: rpsScores[player.id] ?? 0,
      choice: rpsRoundChoices[player.id],
      isMe: player.id === user.uuid,
    }))

    return (
      <Layout>
        <Head title={`${gameTitle} - Round ${gameState?.state?.round || 1}`} />
        <div className="flex-1 bg-main p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <UICard>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-heading">{gameTitle}</h1>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">Round {gameState?.state?.round || 1}</Badge>
                    <Badge variant="secondary">First to {roundsToWin}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {isSpectator && <Badge variant="secondary">Spectator</Badge>}
                  <Badge variant={isConnected ? 'default' : 'destructive'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  <Button variant="neutral" onClick={() => (window.location.href = '/lobbies')}>
                    Leave
                  </Button>
                </div>
              </CardContent>
            </UICard>

            {notifications.length > 0 && (
              <div className="space-y-2">
                {notifications.map((n, i) => (
                  <Alert key={i}>
                    <AlertDescription>{n}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {latestRoundLabel && (
              <Alert>
                <AlertDescription>
                  Round {latestRound?.round}: {latestRoundLabel}
                </AlertDescription>
              </Alert>
            )}

            <UICard>
              <CardHeader>
                <CardTitle>Players & Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {playersWithScores.map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-col gap-2 rounded-base border-2 border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-heading">
                        {player.name} {player.isMe ? '(You)' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {player.choice
                          ? `Choice: ${formatRpsMove(player.choice)}`
                          : 'Choice: hidden'}
                      </p>
                    </div>
                    <Badge variant="secondary">Score: {player.score}</Badge>
                  </div>
                ))}
              </CardContent>
            </UICard>

            <UICard>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isSpectator ? (
                  <p className="text-center text-muted-foreground py-2">
                    Spectator mode: actions are disabled.
                  </p>
                ) : canSubmitMove ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(Object.keys(RPS_MOVE_META) as RpsMove[]).map((move) => {
                      const isSelected = lastSubmittedMove === move

                      return (
                        <button
                          key={move}
                          type="button"
                          onClick={() => handleSubmitMove(move)}
                          disabled={isLoading}
                          className={`group relative rounded-base border-2 p-3 text-left shadow-shadow transition-all
                            hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
                            focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                            ${isSelected ? 'translate-x-boxShadowX translate-y-boxShadowY shadow-none ring-2 ring-black' : ''}
                            ${
                              move === 'rock'
                                ? 'bg-linear-to-br from-amber-100 via-orange-100 to-orange-200 border-orange-300'
                                : move === 'paper'
                                  ? 'bg-linear-to-br from-sky-100 via-cyan-100 to-cyan-200 border-cyan-300'
                                  : 'bg-linear-to-br from-violet-100 via-fuchsia-100 to-fuchsia-200 border-fuchsia-300'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-base uppercase tracking-wide text-gray-700">
                                {RPS_MOVE_META[move].label}
                              </p>
                              <p className="text-xs text-gray-600">
                                {move === 'rock'
                                  ? 'Crushes scissors'
                                  : move === 'paper'
                                    ? 'Covers rock'
                                    : 'Cuts paper'}
                              </p>
                            </div>
                            <span className="text-3xl leading-none">
                              {RPS_MOVE_META[move].picto}
                            </span>
                          </div>
                          <div className="mt-3 text-xs font-base text-gray-700">
                            {isSelected ? 'Selected' : isLoading ? 'Submitting...' : 'Choose move'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-2">
                    {lastSubmittedMove
                      ? `Move submitted (${formatRpsMove(lastSubmittedMove)}), waiting for opponent.`
                      : isMyTurn
                        ? 'Move already submitted, waiting for opponent.'
                        : 'Waiting for other player...'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center">Phase: {phase}</p>
              </CardContent>
            </UICard>

            <UICard>
              <CardHeader>
                <CardTitle>Rounds History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rpsRounds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rounds completed yet.</p>
                ) : (
                  rpsRounds
                    .slice()
                    .reverse()
                    .map((round, index) => (
                      <div
                        key={`history-round-${round.round}-${round.winnerId ?? 'draw'}-${index}`}
                        className="rounded-base border-2 border-border px-3 py-2 text-sm"
                      >
                        <p>
                          <span className="font-semibold mr-2">Round {round.round}</span>
                          <span>
                            {round.winnerId === null
                              ? 'Draw'
                              : round.winnerId === user.uuid
                                ? 'Won by you'
                                : 'Won by opponent'}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(players as Array<{ id: string; name: string }>)
                            .map((player) => {
                              const label = player.id === user.uuid ? 'You' : player.name
                              return `${label}: ${formatRpsMove(round.choices?.[player.id])}`
                            })
                            .join(' • ')}
                        </p>
                      </div>
                    ))
                )}
              </CardContent>
            </UICard>

            <UICard>
              <CardHeader>
                <CardTitle>Replay Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {replayTimeline.length === 0 || !activeReplayStep ? (
                  <p className="text-sm text-muted-foreground">No replay data available yet.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary">
                        Step {replayCursor + 1} / {replayTimeline.length}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayCursor - 1)}
                          disabled={replayCursor <= 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayCursor + 1)}
                          disabled={replayCursor >= replayTimeline.length - 1}
                        >
                          Next
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayTimeline.length - 1)}
                          disabled={isReplayPinnedToLatest}
                        >
                          Live
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-base border-2 border-border p-3 text-sm">
                      <p className="font-semibold">
                        {activeReplayStep.kind === 'initial'
                          ? 'Game started'
                          : `${getPlayerLabel(activeReplayStep.actorId)} played ${activeReplayStep.actionType ?? 'action'}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activeReplayStep.recordedAt).toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Phase: {activeReplayStep.snapshot.phase} | Round:{' '}
                        {activeReplayStep.snapshot.round} | Turn: {activeReplayStep.snapshot.turn}
                      </p>
                    </div>

                    {renderReplayDiff()}

                    <div className="rounded-base border-2 border-border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Snapshot
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        {activeReplayStep.snapshot.players.map((player) => {
                          const scoreDelta = replayDiff?.scoreDeltaByPlayerId?.[player.id] ?? 0
                          return (
                            <div
                              key={`replay-player-${player.id}`}
                              className={`flex items-center justify-between rounded-base px-2 py-1 ${
                                scoreDelta !== 0 ? 'bg-amber-100 border border-amber-300' : ''
                              }`}
                            >
                              <span>
                                {player.name} {player.id === user.uuid ? '(You)' : ''}
                              </span>
                              <span className="flex items-center gap-2">
                                {(activeReplayStep.snapshot.scores?.[player.id] ?? 0).toString()}
                                {scoreDelta !== 0 && (
                                  <span className="text-xs font-semibold text-amber-800">
                                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                                  </span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {activeReplayStep.snapshot.roundChoices &&
                        Object.keys(activeReplayStep.snapshot.roundChoices).length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {(activeReplayStep.snapshot.players ?? [])
                              .map((player) => {
                                const move = activeReplayStep.snapshot.roundChoices?.[player.id]
                                const label = player.id === user.uuid ? 'You' : player.name
                                return `${label}: ${formatRpsMove(move)}`
                              })
                              .join(' • ')}
                          </p>
                        )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Engine Events
                      </p>
                      {activeReplayStep.events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No events for this step.</p>
                      ) : (
                        activeReplayStep.events.map((event, index) => (
                          <div
                            key={`replay-event-${activeReplayStep.step}-${event.type}-${index}`}
                            className="rounded-base border-2 border-border px-3 py-2 text-xs"
                          >
                            <p className="font-semibold">{describeReplayEvent(event)}</p>
                            {canViewDebugPayload ? (
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                                {formatDebugPayload(event.payload)}
                              </pre>
                            ) : (
                              <p className="mt-1 text-muted-foreground">
                                Debug payload hidden for non-admin users.
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </UICard>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head title={`${gameTitle} - Round ${gameState?.state?.round || 1}`} />
      <div className="flex-1 bg-main p-4">
        <div className="max-w-6xl mx-auto mb-4">
          <UICard>
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-heading">{gameTitle}</h1>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">Round {gameState?.state?.round || 1}</Badge>
                  <Badge variant="secondary">Deck: {gameState?.state?.deckCount || 0}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {isSpectator && <Badge variant="secondary">Spectator</Badge>}
                <Badge variant={isConnected ? 'default' : 'destructive'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Button variant="neutral" onClick={() => (window.location.href = '/lobbies')}>
                  Leave
                </Button>
              </div>
            </CardContent>
          </UICard>
        </div>

        {notifications.length > 0 && (
          <div className="max-w-6xl mx-auto mb-4 space-y-2">
            {notifications.map((n, i) => (
              <Alert key={i}>
                <AlertDescription>{n}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <UICard>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      isTarget={selectedTarget === p.id}
                      onSelect={() => setSelectedTarget(p.id)}
                      canTarget={
                        canPlay &&
                        selectedCard !== null &&
                        TARGET_CARDS.includes(selectedCard) &&
                        !p.isMe
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </UICard>
            {!isSpectator && isMyTurn && (
              <Alert className="bg-main border-2 border-border">
                <AlertDescription className="text-center text-main-foreground">
                  <span className="text-xl font-heading">🎮 Your turn!</span>
                  <span className="ml-2">
                    {phase === 'draw' ? 'Draw a card' : phase === 'play' ? 'Play a card' : ''}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4">
            {isSpectator ? (
              <UICard>
                <CardHeader>
                  <CardTitle>Spectator View</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You are watching this game live. Player hands and actions are hidden.
                  </p>
                </CardContent>
              </UICard>
            ) : (
              <UICard>
                <CardHeader>
                  <CardTitle>Your Hand</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {myHand.length > 0 ? (
                      myHand.map((c, i) => (
                        <Card
                          key={i}
                          cardType={c}
                          selected={selectedCard === c}
                          onClick={() => setSelectedCard(selectedCard === c ? null : c)}
                          disabled={!canPlay}
                        />
                      ))
                    ) : (
                      <p className="text-muted-foreground py-8">No cards</p>
                    )}
                  </div>
                  {selectedCard && (
                    <div className="mt-4 p-3 bg-secondary-background rounded-base border-2 border-border">
                      <p className="font-heading">{CARD_INFO[selectedCard]?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {CARD_INFO[selectedCard]?.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </UICard>
            )}

            {!isSpectator && selectedCard === 'guard' && (
              <UICard>
                <CardHeader>
                  <CardTitle>Guess a Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {GUESSABLE_CARDS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedGuess(c)}
                        className={`p-2 rounded-base border-2 text-left transition-all ${selectedGuess === c ? 'border-main bg-main/10' : 'border-border hover:border-main'}`}
                      >
                        <span className="font-heading">{CARD_INFO[c]?.name}</span> (
                        {CARD_INFO[c]?.value})
                      </button>
                    ))}
                  </div>
                </CardContent>
              </UICard>
            )}

            <UICard>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isSpectator ? (
                  <p className="text-center text-muted-foreground py-4">
                    Spectator mode: actions are disabled.
                  </p>
                ) : (
                  <>
                    {canDraw && (
                      <Button onClick={handleDraw} disabled={isLoading} className="w-full">
                        {isLoading ? 'Drawing...' : '🃏 Draw Card'}
                      </Button>
                    )}
                    {canPlay && selectedCard && (
                      <Button onClick={handlePlayCard} disabled={isLoading} className="w-full">
                        {isLoading ? 'Playing...' : `▶️ Play ${CARD_INFO[selectedCard]?.name}`}
                      </Button>
                    )}
                    {!isMyTurn && (
                      <p className="text-center text-muted-foreground py-4">
                        Waiting for other players...
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </UICard>

            <UICard>
              <CardHeader>
                <CardTitle>Replay Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {replayTimeline.length === 0 || !activeReplayStep ? (
                  <p className="text-sm text-muted-foreground">No replay data available yet.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary">
                        Step {replayCursor + 1} / {replayTimeline.length}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayCursor - 1)}
                          disabled={replayCursor <= 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayCursor + 1)}
                          disabled={replayCursor >= replayTimeline.length - 1}
                        >
                          Next
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => moveReplayCursor(replayTimeline.length - 1)}
                          disabled={isReplayPinnedToLatest}
                        >
                          Live
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-base border-2 border-border p-3 text-sm">
                      <p className="font-semibold">
                        {activeReplayStep.kind === 'initial'
                          ? 'Game started'
                          : `${getPlayerLabel(activeReplayStep.actorId)} played ${activeReplayStep.actionType ?? 'action'}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(activeReplayStep.recordedAt).toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Phase: {activeReplayStep.snapshot.phase} | Round:{' '}
                        {activeReplayStep.snapshot.round} | Turn: {activeReplayStep.snapshot.turn}
                      </p>
                    </div>

                    {renderReplayDiff()}

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Engine Events
                      </p>
                      {activeReplayStep.events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No events for this step.</p>
                      ) : (
                        activeReplayStep.events.map((event, index) => (
                          <div
                            key={`replay-ll-event-${activeReplayStep.step}-${event.type}-${index}`}
                            className="rounded-base border-2 border-border px-3 py-2 text-xs"
                          >
                            <p className="font-semibold">{describeReplayEvent(event)}</p>
                            {canViewDebugPayload ? (
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                                {formatDebugPayload(event.payload)}
                              </pre>
                            ) : (
                              <p className="mt-1 text-muted-foreground">
                                Debug payload hidden for non-admin users.
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </UICard>
          </div>
        </div>
      </div>
    </Layout>
  )
}
