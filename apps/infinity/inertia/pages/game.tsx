import { useCallback, useEffect, useMemo, useState } from 'react'
import { Head } from '@inertiajs/react'
import type { RendererKind } from '@infinity.dev/game-engine'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { useTransmit } from '../contexts/TransmitContext'
import Layout from '../layouts/layout'
import {
  formatGameTitle,
  resolveGameRenderer,
  resolveRendererOptions,
} from '../games/game_renderer_registry.js'
import type {
  GameRendererOptions,
  PlayerViewState,
  ReplayStep,
  RpsMove,
} from '../games/game_renderer_types.js'

const TARGET_CARD_TYPES = new Set(['guard', 'priest', 'baron', 'prince', 'king'])
const CARD_DISPLAY_NAMES: Record<string, string> = {
  guard: 'Guard',
  priest: 'Priest',
  baron: 'Baron',
  handmaid: 'Handmaid',
  prince: 'Prince',
  king: 'King',
  countess: 'Countess',
  princess: 'Princess',
}

interface GameProps {
  gameId: string
  gameType: string
  gameTitle?: string | null
  rendererKind?: RendererKind | null
  rendererOptions?: GameRendererOptions | null
  pollingIntervalMs?: number | null
  showReplayDiff?: boolean | null
  playerView: PlayerViewState | null
  availableActions: string[]
  replayTimeline?: ReplayStep[]
  user: { uuid: string; nickName: string; role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' }
  isFinished: boolean
  isSpectator?: boolean
  game?: unknown
}

export default function Game({
  gameId,
  gameType,
  gameTitle: initialGameTitle,
  rendererKind,
  rendererOptions,
  pollingIntervalMs: initialPollingIntervalMs,
  showReplayDiff = null,
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
  const resolvedRenderer = resolveGameRenderer({ rendererKind, gameType })
  const resolvedRendererOptions = resolveRendererOptions({
    rendererKind,
    gameType,
    rendererOptions,
  })
  const pollingIntervalMs = initialPollingIntervalMs ?? resolvedRenderer?.pollingIntervalMs ?? 5000
  const gameTitle = initialGameTitle ?? formatGameTitle(gameType)

  const addNotification = useCallback((message: string) => {
    setNotifications((currentNotifications) => [...currentNotifications, message])
    setTimeout(() => {
      setNotifications((currentNotifications) => currentNotifications.slice(1))
    }, 5000)
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
    setReplayCursor((currentCursor) => {
      if (isReplayPinnedToLatest) {
        return lastIndex
      }

      return Math.min(currentCursor, lastIndex)
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

      const replayPlayer = activeReplayStep?.snapshot.players.find((player) => player.id === playerId)
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

  const renderReplayDiffSection = useCallback(() => {
    if (showReplayDiff === false) {
      return null
    }

    return renderReplayDiff()
  }, [renderReplayDiff, showReplayDiff])

  const refreshGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/games/${gameId}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
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

  const handleDraw = useCallback(async () => {
    if (isLoading) {
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

      const response = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'draw' }),
      })
      const result = await response.json()
      if (result.success) {
        addNotification('Card drawn!')
        await refreshGameState()
      } else {
        addNotification(`Error: ${result.error}`)
      }
    } catch {
      addNotification('Failed to draw')
    } finally {
      setIsLoading(false)
    }
  }, [addNotification, gameId, isLoading, refreshGameState])

  const handleSubmitMove = useCallback(
    async (move: RpsMove) => {
      if (isLoading) {
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

        const response = await fetch(`/api/v1/games/${gameId}/action`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ actionType: 'submit_move', move }),
        })

        const result = await response.json()
        if (result.success) {
          setLastSubmittedMove(move)
          addNotification(`Move submitted: ${move}`)
          await refreshGameState()
        } else {
          addNotification(`Error: ${result.error}`)
        }
      } catch {
        addNotification('Failed to submit move')
      } finally {
        setIsLoading(false)
      }
    },
    [addNotification, gameId, isLoading, refreshGameState]
  )

  const handlePlayCard = useCallback(async () => {
    if (!selectedCard || isLoading) {
      return
    }

    const needsTarget = TARGET_CARD_TYPES.has(selectedCard) && selectedCard !== 'prince'
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

      const response = await fetch(`/api/v1/games/${gameId}/action`, {
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
      const result = await response.json()
      if (result.success) {
        addNotification(`Played ${CARD_DISPLAY_NAMES[selectedCard] ?? selectedCard}!`)
        setSelectedCard(null)
        setSelectedTarget(null)
        setSelectedGuess(null)
        await refreshGameState()
      } else {
        addNotification(`Error: ${result.error}`)
      }
    } catch {
      addNotification('Failed to play')
    } finally {
      setIsLoading(false)
    }
  }, [addNotification, gameId, isLoading, refreshGameState, selectedCard, selectedGuess, selectedTarget])

  const handleLeave = useCallback(() => {
    window.location.href = '/lobbies'
  }, [])

  useEffect(() => {
    if (!isConnected) {
      return
    }

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
    if (!isConnected) {
      return
    }

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
  }, [pollingIntervalMs, refreshGameState])

  useEffect(() => {
    refreshGameState().catch(() => undefined)
  }, [refreshGameState])

  const isGameFinished = isFinished || gameState?.state?.isFinished || false
  const isMyTurn = gameState?.isMyTurn || false
  const phase = gameState?.state?.phase || 'waiting'
  const canDraw = !isSpectator && availableActions.includes('draw_card')
  const canPlay = !isSpectator && availableActions.includes('play_card')
  const canSubmitMove = !isSpectator && availableActions.includes('submit_move')

  if (!resolvedRenderer) {
    return (
      <Layout>
        <Head title={`${gameTitle} - Unsupported Renderer`} />
        <div className="flex flex-1 items-center justify-center bg-main p-4">
          <UICard className="max-w-xl w-full">
            <CardHeader>
              <CardTitle>Renderer unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No frontend renderer is registered for `{gameType}` yet.
              </p>
              <Button onClick={handleLeave} className="w-full">
                Back to Lobbies
              </Button>
            </CardContent>
          </UICard>
        </div>
      </Layout>
    )
  }

  const RendererComponent = resolvedRenderer.Component
  const pageTitle = isGameFinished
    ? `Game Over - ${gameTitle}`
    : `${gameTitle} - Round ${gameState?.state?.round || 1}`

  return (
    <Layout>
      <Head title={pageTitle} />
      <RendererComponent
        gameTitle={gameTitle}
        rendererOptions={resolvedRendererOptions ?? null}
        gameState={gameState}
        user={user}
        isFinished={isGameFinished}
        isSpectator={isSpectator}
        isConnected={isConnected}
        isLoading={isLoading}
        notifications={notifications}
        replayTimeline={replayTimeline}
        replayCursor={replayCursor}
        isReplayPinnedToLatest={isReplayPinnedToLatest}
        activeReplayStep={activeReplayStep}
        canViewDebugPayload={canViewDebugPayload}
        myHand={myHand}
        selectedCard={selectedCard}
        selectedTarget={selectedTarget}
        selectedGuess={selectedGuess}
        lastSubmittedMove={lastSubmittedMove}
        isMyTurn={isMyTurn}
        phase={phase}
        canDraw={canDraw}
        canPlay={canPlay}
        canSubmitMove={canSubmitMove}
        onLeave={handleLeave}
        onDraw={handleDraw}
        onSubmitMove={handleSubmitMove}
        onPlayCard={handlePlayCard}
        onSelectCard={setSelectedCard}
        onSelectTarget={setSelectedTarget}
        onSelectGuess={setSelectedGuess}
        moveReplayCursor={moveReplayCursor}
        getPlayerLabel={getPlayerLabel}
        describeReplayEvent={describeReplayEvent}
        formatDebugPayload={formatDebugPayload}
        renderReplayDiff={renderReplayDiffSection}
      />
    </Layout>
  )
}
