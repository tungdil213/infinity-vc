import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTransmit } from '../contexts/TransmitContext'
import {
  computeReplayDiff,
  describeGameReplayEvent,
  formatGameDebugPayload,
  resolveGamePlayerLabel,
} from '../games/game_replay_helpers.js'
import { ReplayDiffPanel } from '../games/replay_diff_panel.js'
import { resolveTurnBasedCardHandActionState } from '../games/turn_based_card_hand_action_state.js'
import type { GameRendererProps, PlayerViewState, ReplayStep, RpsMove } from '../games/game_renderer_types.js'

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

interface GameStateResponsePayload {
  playerView?: PlayerViewState | null
  availableActions?: string[]
  replayTimeline?: ReplayStep[]
}

interface GameActionResponsePayload extends GameStateResponsePayload {
  success?: boolean
  error?: string
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

export interface UseGamePageControllerResult
  extends Pick<
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

function buildJsonHeaders(): Record<string, string> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken
  }

  return headers
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
  const [lastSubmittedMove, setLastSubmittedMove] = useState<RpsMove | null>(null)
  const [myHand, setMyHand] = useState<string[]>(extractHand(playerView))
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
  const notificationTimeoutIdsRef = useRef<number[]>([])
  const canViewDebugPayload = user.role === 'ADMIN'

  const { isConnected, subscribeToGame } = useTransmit()

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

  useEffect(
    () => () => {
      notificationTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      notificationTimeoutIdsRef.current = []
    },
    []
  )

  const addNotification = useCallback((message: string) => {
    setNotifications((currentNotifications) => [...currentNotifications, message])

    const timeoutId = window.setTimeout(() => {
      setNotifications((currentNotifications) => currentNotifications.slice(1))
      notificationTimeoutIdsRef.current = notificationTimeoutIdsRef.current.filter(
        (currentTimeoutId) => currentTimeoutId !== timeoutId
      )
    }, 5000)

    notificationTimeoutIdsRef.current.push(timeoutId)
  }, [])

  const applyGameStatePayload = useCallback((payload: GameStateResponsePayload) => {
    const nextPlayerView = payload.playerView ?? null
    const nextAvailableActions = payload.availableActions ?? []

    setGameState(nextPlayerView)
    setAvailableActions(nextAvailableActions)
    setMyHand(extractHand(nextPlayerView))

    if (nextAvailableActions.includes('submit_move')) {
      setLastSubmittedMove(null)
    }

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

  const postGameAction = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch(`/api/v1/games/${gameId}/action`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      })

      return (await response.json()) as GameActionResponsePayload
    },
    [gameId]
  )

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
  const canDraw = !isSpectator && availableActions.includes('draw_card')
  const canPlay = !isSpectator && availableActions.includes('play_card')
  const canSubmitMove = !isSpectator && availableActions.includes('submit_move')
  const playValidationPlayers = useMemo(
    () =>
      (gameState?.state?.players ?? []).map((player) => ({
        id: String(player.id ?? ''),
        isProtected: Boolean(player.isProtected),
        isEliminated: Boolean(player.isEliminated),
        isMe: String(player.id ?? '') === user.uuid,
      })),
    [gameState?.state?.players, user.uuid]
  )
  const playActionState = useMemo(
    () =>
      resolveTurnBasedCardHandActionState({
        canPlay,
        myHand,
        selectedCard,
        selectedTarget,
        selectedGuess,
        players: playValidationPlayers,
      }),
    [canPlay, myHand, playValidationPlayers, selectedCard, selectedGuess, selectedTarget]
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

  const formatDebugPayload = useCallback(
    (payload: unknown) => formatGameDebugPayload(payload),
    []
  )

  const renderReplayDiff = useCallback((): ReactNode => {
    if (showReplayDiff === false) {
      return null
    }

    return <ReplayDiffPanel replayDiff={replayDiff} getPlayerLabel={getPlayerLabel} />
  }, [getPlayerLabel, replayDiff, showReplayDiff])

  const handleDraw = useCallback(async () => {
    if (isLoading) {
      return
    }

    setIsLoading(true)
    try {
      const result = await postGameAction({ action: 'draw' })
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
  }, [addNotification, isLoading, postGameAction, refreshGameState])

  const handleSubmitMove = useCallback(
    async (move: RpsMove) => {
      if (isLoading) {
        return
      }

      setIsLoading(true)
      try {
        const result = await postGameAction({ actionType: 'submit_move', move })
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
    [addNotification, isLoading, postGameAction, refreshGameState]
  )

  const handlePlayCard = useCallback(async () => {
    if (!selectedCard || isLoading) {
      return
    }

    if (!playActionState.canAttemptPlay) {
      addNotification(playActionState.helperText ?? 'Complete the action setup before playing.')
      return
    }

    setIsLoading(true)
    try {
      const result = await postGameAction({
        action: 'play',
        cardType: selectedCard,
        targetPlayerId: selectedTarget,
        guessedCard: selectedGuess,
      })

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
  }, [
    addNotification,
    isLoading,
    postGameAction,
    playActionState,
    refreshGameState,
    selectedCard,
    selectedGuess,
    selectedTarget,
  ])

  const handleLeave = useCallback(() => {
    window.location.assign('/lobbies')
  }, [])

  const handleSelectCard = useCallback((cardType: string | null) => {
    setSelectedCard(cardType)
    setSelectedTarget(null)
    setSelectedGuess(null)
  }, [])

  const handleSelectTarget = useCallback((playerId: string | null) => {
    setSelectedTarget((currentTarget) => (currentTarget === playerId ? null : playerId))
  }, [])

  const handleSelectGuess = useCallback((cardType: string | null) => {
    setSelectedGuess((currentGuess) => (currentGuess === cardType ? null : cardType))
  }, [])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      unsubscribe = await subscribeToGame(gameId, () => {
        refreshGameState().catch(() => undefined)
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
    onDraw: handleDraw,
    onSubmitMove: handleSubmitMove,
    onPlayCard: handlePlayCard,
    onSelectCard: handleSelectCard,
    onSelectTarget: handleSelectTarget,
    onSelectGuess: handleSelectGuess,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  }
}
