import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeReplayDiff,
  describeGameReplayEvent,
  formatGameDebugPayload,
  resolveGamePlayerLabel,
} from '../games/game_replay_helpers.js'
import { ReplayDiffPanel } from '../games/replay_diff_panel.js'
import type { GamePlayerSummary, ReplayStep } from '../games/game_renderer_types.js'
import type { ReactNode } from 'react'

interface UseGameReplayOptions {
  initialReplayTimeline: ReplayStep[]
  currentPlayers: readonly GamePlayerSummary[]
  currentUserId: string
  showReplayDiff?: boolean | null
}

interface UseGameReplayResult {
  replayTimeline: ReplayStep[]
  replayCursor: number
  isReplayPinnedToLatest: boolean
  activeReplayStep: ReplayStep | null
  replaceReplayTimeline: (nextReplayTimeline: ReplayStep[]) => void
  moveReplayCursor: (nextCursor: number) => void
  getPlayerLabel: (playerId?: string | null) => string
  describeReplayEvent: (event: { type: string; payload: unknown }) => string
  formatDebugPayload: (payload: unknown) => string
  renderReplayDiff: () => ReactNode
}

export function resolveInitialGameReplayCursor(timelineLength: number): number {
  return Math.max(timelineLength - 1, 0)
}

export function resolveGameReplayMove(options: {
  nextCursor: number
  timelineLength: number
  previousIsReplayPinnedToLatest: boolean
}): {
  replayCursor: number
  isReplayPinnedToLatest: boolean
} {
  if (options.timelineLength === 0) {
    return {
      replayCursor: 0,
      isReplayPinnedToLatest: options.previousIsReplayPinnedToLatest,
    }
  }

  const lastIndex = options.timelineLength - 1
  const replayCursor = Math.max(0, Math.min(options.nextCursor, lastIndex))

  return {
    replayCursor,
    isReplayPinnedToLatest: replayCursor === lastIndex,
  }
}

export function resolveSyncedGameReplayCursor(options: {
  currentCursor: number
  timelineLength: number
  isReplayPinnedToLatest: boolean
}): number {
  if (options.timelineLength === 0) {
    return 0
  }

  const lastIndex = options.timelineLength - 1

  if (options.isReplayPinnedToLatest) {
    return lastIndex
  }

  return Math.min(options.currentCursor, lastIndex)
}

export function useGameReplay(options: UseGameReplayOptions): UseGameReplayResult {
  const { initialReplayTimeline, currentPlayers, currentUserId, showReplayDiff = null } = options
  const [replayTimeline, setReplayTimeline] = useState<ReplayStep[]>(initialReplayTimeline)
  const [replayCursor, setReplayCursor] = useState<number>(
    resolveInitialGameReplayCursor(initialReplayTimeline.length)
  )
  const [isReplayPinnedToLatest, setIsReplayPinnedToLatest] = useState(true)

  useEffect(() => {
    setReplayTimeline(initialReplayTimeline)
    setReplayCursor(resolveInitialGameReplayCursor(initialReplayTimeline.length))
    setIsReplayPinnedToLatest(true)
  }, [initialReplayTimeline])

  const replaceReplayTimeline = useCallback((nextReplayTimeline: ReplayStep[]) => {
    setReplayTimeline(nextReplayTimeline)
  }, [])

  const moveReplayCursor = useCallback(
    (nextCursor: number) => {
      const nextReplayState = resolveGameReplayMove({
        nextCursor,
        timelineLength: replayTimeline.length,
        previousIsReplayPinnedToLatest: isReplayPinnedToLatest,
      })

      setReplayCursor(nextReplayState.replayCursor)
      setIsReplayPinnedToLatest(nextReplayState.isReplayPinnedToLatest)
    },
    [isReplayPinnedToLatest, replayTimeline.length]
  )

  useEffect(() => {
    setReplayCursor((currentCursor) =>
      resolveSyncedGameReplayCursor({
        currentCursor,
        timelineLength: replayTimeline.length,
        isReplayPinnedToLatest,
      })
    )
  }, [isReplayPinnedToLatest, replayTimeline])

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
        currentUserId,
        replayPlayers: activeReplayStep?.snapshot.players,
        currentPlayers,
      }),
    [activeReplayStep?.snapshot.players, currentPlayers, currentUserId]
  )

  const describeReplayEventForUi = useCallback(
    (event: { type: string; payload: unknown }) =>
      describeGameReplayEvent({
        event,
        getPlayerLabel,
      }),
    [getPlayerLabel]
  )

  const formatDebugPayloadForUi = useCallback(
    (payload: unknown) => formatGameDebugPayload(payload),
    []
  )

  const renderReplayDiff = useCallback((): ReactNode => {
    if (showReplayDiff === false) {
      return null
    }

    return <ReplayDiffPanel replayDiff={replayDiff} getPlayerLabel={getPlayerLabel} />
  }, [getPlayerLabel, replayDiff, showReplayDiff])

  return {
    replayTimeline,
    replayCursor,
    isReplayPinnedToLatest,
    activeReplayStep,
    replaceReplayTimeline,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent: describeReplayEventForUi,
    formatDebugPayload: formatDebugPayloadForUi,
    renderReplayDiff,
  }
}
