import { useCallback, useEffect, useState } from 'react'
import { useTransmit } from '../contexts/TransmitContext.js'
import { useGameActions } from './use_game_actions.js'
import { useGameNotifications } from './use_game_notifications.js'
import { useGamePolling } from './use_game_polling.js'
import { useGameReplay } from './use_game_replay.js'
import type {
  GameRendererProps,
  PlayerViewState,
  ReplayStep,
} from '../games/game_renderer_types.js'

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
  const canViewDebugPayload = user.role === 'ADMIN'

  const { isConnected, subscribeToGame } = useTransmit()
  const { notifications, addNotification } = useGameNotifications()
  const {
    replayTimeline,
    replayCursor,
    isReplayPinnedToLatest,
    activeReplayStep,
    replaceReplayTimeline,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  } = useGameReplay({
    initialReplayTimeline,
    currentPlayers: gameState?.state?.players ?? [],
    currentUserId: user.uuid,
    showReplayDiff,
  })

  useEffect(() => {
    setGameState(playerView)
    setAvailableActions(initialActions || [])
    setMyHand(extractHand(playerView))
  }, [initialActions, playerView])

  const applyGameStatePayload = useCallback(
    (payload: GameStateResponsePayload) => {
      const nextPlayerView = payload.playerView ?? null
      const nextAvailableActions = payload.availableActions ?? []

      setGameState(nextPlayerView)
      setAvailableActions(nextAvailableActions)
      setMyHand(extractHand(nextPlayerView))

      if (Array.isArray(payload.replayTimeline)) {
        replaceReplayTimeline(payload.replayTimeline)
      }
    },
    [replaceReplayTimeline]
  )

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
