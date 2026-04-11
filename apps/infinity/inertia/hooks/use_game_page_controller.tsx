import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import {
  computeReplayDiff,
  describeGameReplayEvent,
  formatGameDebugPayload,
  resolveGamePlayerLabel,
} from '../games/game_replay_helpers.js'
import { ReplayDiffPanel } from '../games/replay_diff_panel.js'
import { useGameActions } from './use_game_actions.js'
import { useGameNotifications } from './use_game_notifications.js'
import { useGamePolling } from './use_game_polling.js'
import type {
  GameRendererProps,
  PlayerViewState,
  ReplayStep,
} from '../games/game_renderer_types.js'
import type { ReactNode } from 'react'

interface GameStateResponsePayload {
  playerView?: PlayerViewState | null
  availableActions?: string[]
  replayTimeline?: ReplayStep[]
}

interface UseGamePageControllerArgs {
  gameId: string
  user: GameRendererProps['user']
  playerView: PlayerViewState | null
  initialActions: string[]
  initialReplayTimeline: ReplayStep[]
  isFinished: boolean
  isSpectator: boolean
  pollingIntervalMs: number
  showReplayDiff?: boolean | null
}

export interface UseGamePageControllerResult extends Pick<
  GameRendererProps,
  | 'gameState'
  | 'isConnected'
  | 'isLoading'
  | 'notifications'
  | 'replayTimeline'
  | 'replayCursor'
  | 'isReplayPinnedToLatest'
  | 'activeReplayStep'
  | 'canViewDebugPayload'
  | 'myHand'
  | 'selectedCard'
  | 'selectedTarget'
  | 'selectedGuess'
  | 'lastSubmittedMove'
  | 'isMyTurn'
  | 'phase'
  | 'canDraw'
  | 'canPlay'
  | 'canSubmitMove'
  | 'onLeave'
  | 'onDraw'
  | 'onSubmitMove'
  | 'onPlayCard'
  | 'onSelectCard'
  | 'onSelectTarget'
  | 'onSelectGuess'
  | 'moveReplayCursor'
  | 'getPlayerLabel'
  | 'describeReplayEvent'
  | 'formatDebugPayload'
  | 'renderReplayDiff'
> {
  isGameFinished: boolean
}

function extractHand(playerView: PlayerViewState | null): string[] {
  return Array.isArray(playerView?.state?.myHand) ? playerView.state.myHand : []
}

export function useGamePageController(
  args: UseGamePageControllerArgs
): UseGamePageControllerResult {
  const {
    gameId,
    user,
    playerView,
    initialActions,
    initialReplayTimeline,
    isFinished,
    isSpectator,
    pollingIntervalMs,
    showReplayDiff = null,
  } = args

  const [gameState, setGameState] = useState<PlayerViewState | null>(playerView)
  const [availableActions, setAvailableActions] = useState<string[]>(initialActions || [])
  const [myHand, setMyHand] = useState<string[]>(extractHand(playerView))
  const [replayTimeline, setReplayTimeline] = useState<ReplayStep[]>(initialReplayTimeline)
  const [replayCursor, setReplayCursor] = useState<number>(
    Math.max(initialReplayTimeline.length - 1, 0)
  )
  const [isReplayPinnedToLatest, setIsReplayPinnedToLatest] = useState(true)
  const canViewDebugPayload = user.role === 'ADMIN'

  const { isConnected, subscribeToGame } = useTransmit()
  const { notifications, addNotification } = useGameNotifications()

  useEffect(() => {
    setGameState(playerView)
    setAvailableActions(initialActions || [])
    setMyHand(extractHand(playerView))
  }, [initialActions, playerView])

  useEffect(() => {
    setReplayTimeline(initialReplayTimeline)
    setReplayCursor(Math.max(initialReplayTimeline.length - 1, 0))
    setIsReplayPinnedToLatest(true)
  }, [initialReplayTimeline])

  const applyGameStatePayload = useCallback((payload: GameStateResponsePayload) => {
    const nextPlayerView = payload.playerView ?? null
    const nextAvailableActions = payload.availableActions ?? []

    setGameState(nextPlayerView)
    setAvailableActions(nextAvailableActions)
    setMyHand(extractHand(nextPlayerView))

    if (Array.isArray(payload.replayTimeline)) {
      setReplayTimeline(payload.replayTimeline)
    }
  }, [])

  const refreshGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/games/${gameId}`, { credentials: 'include' })
      if (!response.ok) {
        return
      }

      const data = (await response.json()) as GameStateResponsePayload
      applyGameStatePayload(data)
    } catch {
      return
    }
  }, [applyGameStatePayload, gameId])

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

  const replayDiff = useMemo(
    () => computeReplayDiff(activeReplayStep, previousReplayStep),
    [activeReplayStep, previousReplayStep]
  )

  const getPlayerLabel = useCallback(
    (playerId?: string | null) =>
      resolveGamePlayerLabel({
        playerId,
        currentUserId: user.uuid,
        replayPlayers: activeReplayStep?.snapshot.players,
        currentPlayers: gameState?.state?.players,
      }),
    [activeReplayStep?.snapshot.players, gameState?.state?.players, user.uuid]
  )

  const describeReplayEvent = useCallback(
    (event: { type: string; payload: unknown }) =>
      describeGameReplayEvent({
        event,
        getPlayerLabel,
      }),
    [getPlayerLabel]
  )

  const formatDebugPayload = useCallback((payload: unknown) => formatGameDebugPayload(payload), [])

  const renderReplayDiff = useCallback((): ReactNode => {
    if (showReplayDiff === false) {
      return null
    }

    return <ReplayDiffPanel replayDiff={replayDiff} getPlayerLabel={getPlayerLabel} />
  }, [getPlayerLabel, replayDiff, showReplayDiff])

  const {
    isLoading,
    selectedCard,
    selectedTarget,
    selectedGuess,
    lastSubmittedMove,
    canDraw,
    canPlay,
    canSubmitMove,
    onDraw,
    onSubmitMove,
    onPlayCard,
    onSelectCard,
    onSelectTarget,
    onSelectGuess,
  } = useGameActions({
    gameId,
    isSpectator,
    availableActions,
    myHand,
    players: gameState?.state?.players ?? [],
    currentUserId: user.uuid,
    addNotification,
    refreshGameState,
  })

  const handleLeave = useCallback(() => {
    window.location.assign('/lobbies')
  }, [])

  useGamePolling({
    gameId,
    isConnected,
    pollingIntervalMs,
    refreshGameState,
    subscribeToGame,
  })

  const isGameFinished = isFinished || gameState?.state?.isFinished || false
  const isMyTurn = gameState?.isMyTurn || false
  const phase = gameState?.state?.phase || 'waiting'

  return {
    gameState,
    isConnected,
    isLoading,
    notifications,
    replayTimeline,
    replayCursor,
    isReplayPinnedToLatest,
    activeReplayStep,
    canViewDebugPayload,
    myHand,
    selectedCard,
    selectedTarget,
    selectedGuess,
    lastSubmittedMove,
    isMyTurn,
    phase,
    canDraw,
    canPlay,
    canSubmitMove,
    isGameFinished,
    onLeave: handleLeave,
    onDraw,
    onSubmitMove,
    onPlayCard,
    onSelectCard,
    onSelectTarget,
    onSelectGuess,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  }
}
