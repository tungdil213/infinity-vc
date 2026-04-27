import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveTurnBasedCardHandActionState } from '../games/turn_based_card_hand_action_state.js'
import type { GamePlayerSummary, RpsMove } from '../games/game_renderer_types.js'

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

interface GameActionResponsePayload {
  success?: boolean
  error?: string
}

interface GameActionDocumentAdapter {
  querySelector(selector: string): {
    getAttribute(attribute: string): string | null
  } | null
}

interface BuildGameActionJsonHeadersOptions {
  documentAdapter?: GameActionDocumentAdapter
}

interface PostGameActionRequestOptions {
  gameId: string
  body: Record<string, unknown>
  fetchImpl?: typeof fetch
  documentAdapter?: GameActionDocumentAdapter
}

interface ExecuteGameActionSubmissionOptions {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  submit: () => Promise<GameActionResponsePayload>
  addNotification: (message: string) => void
  failureMessage: string
  onSuccess: () => Promise<void> | void
}

interface SyncSubmittedMoveStateOptions {
  nextAvailableActions: readonly string[]
  setLastSubmittedMove: (move: RpsMove | null) => void
}

interface UseGameActionsOptions {
  gameId: string
  isSpectator: boolean
  availableActions: readonly string[]
  myHand: readonly string[]
  players: readonly GamePlayerSummary[]
  currentUserId: string
  addNotification: (message: string) => void
  refreshGameState: () => Promise<void>
}

interface UseGameActionsResult {
  isLoading: boolean
  selectedCard: string | null
  selectedTarget: string | null
  selectedGuess: string | null
  lastSubmittedMove: RpsMove | null
  canDraw: boolean
  canPlay: boolean
  canSubmitMove: boolean
  onDraw: () => Promise<void>
  onSubmitMove: (move: RpsMove) => Promise<void>
  onPlayCard: () => Promise<void>
  onSelectCard: (cardType: string | null) => void
  onSelectTarget: (playerId: string | null) => void
  onSelectGuess: (cardType: string | null) => void
}

export function buildGameActionJsonHeaders(
  options: BuildGameActionJsonHeadersOptions = {}
): Record<string, string> {
  const documentAdapter = options.documentAdapter ?? document
  const csrfToken = documentAdapter
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken
  }

  return headers
}

export async function postGameActionRequest(
  options: PostGameActionRequestOptions
): Promise<GameActionResponsePayload> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(`/api/v1/games/${options.gameId}/action`, {
    method: 'POST',
    headers: buildGameActionJsonHeaders({
      documentAdapter: options.documentAdapter,
    }),
    credentials: 'include',
    body: JSON.stringify(options.body),
  })

  return (await response.json()) as GameActionResponsePayload
}

export async function executeGameActionSubmission(
  options: ExecuteGameActionSubmissionOptions
): Promise<void> {
  if (options.isLoading) {
    return
  }

  options.setIsLoading(true)
  try {
    const result = await options.submit()
    if (result.success) {
      await options.onSuccess()
    } else {
      options.addNotification(`Error: ${result.error}`)
    }
  } catch {
    options.addNotification(options.failureMessage)
  } finally {
    options.setIsLoading(false)
  }
}

export function syncSubmittedMoveStateFromAvailableActions(
  options: SyncSubmittedMoveStateOptions
): void {
  if (options.nextAvailableActions.includes('submit_move')) {
    options.setLastSubmittedMove(null)
  }
}

export function useGameActions(options: UseGameActionsOptions): UseGameActionsResult {
  const {
    gameId,
    isSpectator,
    availableActions,
    myHand,
    players,
    currentUserId,
    addNotification,
    refreshGameState,
  } = options
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null)
  const [lastSubmittedMove, setLastSubmittedMove] = useState<RpsMove | null>(null)

  const canDraw = !isSpectator && availableActions.includes('draw_card')
  const canPlay = !isSpectator && availableActions.includes('play_card')
  const canSubmitMove = !isSpectator && availableActions.includes('submit_move')

  const playValidationPlayers = useMemo(
    () =>
      players.map((player) => ({
        id: String(player.id ?? ''),
        isProtected: Boolean(player.isProtected),
        isEliminated: Boolean(player.isEliminated),
        isMe: String(player.id ?? '') === currentUserId,
      })),
    [currentUserId, players]
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

  useEffect(() => {
    syncSubmittedMoveStateFromAvailableActions({
      nextAvailableActions: availableActions,
      setLastSubmittedMove,
    })
  }, [availableActions])

  const postGameAction = useCallback(
    async (body: Record<string, unknown>) =>
      postGameActionRequest({
        gameId,
        body,
      }),
    [gameId]
  )

  const onDraw = useCallback(
    async () =>
      executeGameActionSubmission({
        isLoading,
        setIsLoading,
        submit: () => postGameAction({ action: 'draw' }),
        addNotification,
        failureMessage: 'Failed to draw',
        onSuccess: async () => {
          addNotification('Card drawn!')
          await refreshGameState()
        },
      }),
    [addNotification, isLoading, postGameAction, refreshGameState]
  )

  const onSubmitMove = useCallback(
    async (move: RpsMove) =>
      executeGameActionSubmission({
        isLoading,
        setIsLoading,
        submit: () => postGameAction({ actionType: 'submit_move', move }),
        addNotification,
        failureMessage: 'Failed to submit move',
        onSuccess: async () => {
          setLastSubmittedMove(move)
          addNotification(`Move submitted: ${move}`)
          await refreshGameState()
        },
      }),
    [addNotification, isLoading, postGameAction, refreshGameState]
  )

  const onPlayCard = useCallback(async () => {
    if (!selectedCard || isLoading) {
      return
    }

    if (!playActionState.canAttemptPlay) {
      addNotification(playActionState.helperText ?? 'Complete the action setup before playing.')
      return
    }

    await executeGameActionSubmission({
      isLoading,
      setIsLoading,
      submit: () =>
        postGameAction({
          action: 'play',
          cardType: selectedCard,
          targetPlayerId: selectedTarget,
          guessedCard: selectedGuess,
        }),
      addNotification,
      failureMessage: 'Failed to play',
      onSuccess: async () => {
        addNotification(`Played ${CARD_DISPLAY_NAMES[selectedCard] ?? selectedCard}!`)
        setSelectedCard(null)
        setSelectedTarget(null)
        setSelectedGuess(null)
        await refreshGameState()
      },
    })
  }, [
    addNotification,
    isLoading,
    playActionState,
    postGameAction,
    refreshGameState,
    selectedCard,
    selectedGuess,
    selectedTarget,
  ])

  const onSelectCard = useCallback((cardType: string | null) => {
    setSelectedCard(cardType)
    setSelectedTarget(null)
    setSelectedGuess(null)
  }, [])

  const onSelectTarget = useCallback((playerId: string | null) => {
    setSelectedTarget((currentTarget) => (currentTarget === playerId ? null : playerId))
  }, [])

  const onSelectGuess = useCallback((cardType: string | null) => {
    setSelectedGuess((currentGuess) => (currentGuess === cardType ? null : cardType))
  }, [])

  return {
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
  }
}
