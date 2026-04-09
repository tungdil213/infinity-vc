import type { GameActionResponse, GameSession } from '#application/services/game_engine_service'
import type { GameReplayStep } from '#application/services/game_engine_types'
import type { GamePresentationDefinition } from '@infinity.dev/game-engine'

export function toGamePagePayload(args: {
  session: GameSession
  playerView: unknown
  availableActions: string[]
  user: { uuid: string; nickName: string; role?: string }
  gameDisplayName?: string
  isSpectator?: boolean
  replayTimeline?: GameReplayStep[]
  runtimeStatus?: {
    source: 'memory' | 'restored'
    persisted: boolean
    inMemory: boolean
  }
  gamePresentation?: GamePresentationDefinition
}) {
  const {
    session,
    playerView,
    availableActions,
    user,
    gameDisplayName,
    isSpectator = false,
    replayTimeline = [],
    runtimeStatus,
    gamePresentation,
  } = args

  return {
    gameId: session.gameId,
    gameType: session.gameType,
    gameTitle: gameDisplayName ?? null,
    rendererKind: gamePresentation?.rendererKind ?? null,
    pollingIntervalMs: gamePresentation?.pollingIntervalMs ?? null,
    showReplayDiff: gamePresentation?.showReplayDiff ?? null,
    rendererOptions: gamePresentation?.rendererOptions ?? null,
    playerView: normalizePlayerViewForFrontend(playerView, gamePresentation),
    availableActions,
    replayTimeline,
    user,
    isFinished: session.state.isFinished,
    isSpectator,
    ...(runtimeStatus ? { runtimeStatus } : {}),
  }
}

export function toGameApiPayload(args: {
  session: GameSession
  playerView: unknown
  availableActions: string[]
  gameDisplayName?: string
  isSpectator?: boolean
  replayTimeline?: GameReplayStep[]
  runtimeStatus?: {
    source: 'memory' | 'restored'
    persisted: boolean
    inMemory: boolean
  }
  gamePresentation?: GamePresentationDefinition
}) {
  const {
    session,
    playerView,
    availableActions,
    gameDisplayName,
    isSpectator = false,
    replayTimeline = [],
    runtimeStatus,
    gamePresentation,
  } = args

  return {
    gameId: session.gameId,
    gameType: session.gameType,
    gameTitle: gameDisplayName ?? null,
    rendererKind: gamePresentation?.rendererKind ?? null,
    pollingIntervalMs: gamePresentation?.pollingIntervalMs ?? null,
    showReplayDiff: gamePresentation?.showReplayDiff ?? null,
    rendererOptions: gamePresentation?.rendererOptions ?? null,
    playerView: normalizePlayerViewForFrontend(playerView, gamePresentation),
    availableActions,
    replayTimeline,
    isFinished: session.state.isFinished,
    isSpectator,
    ...(runtimeStatus ? { runtimeStatus } : {}),
  }
}

export function toGameActionsPayload(args: {
  session: GameSession
  availableActions: string[]
  currentUserUuid: string
  isSpectator?: boolean
}) {
  const { session, availableActions, currentUserUuid, isSpectator = false } = args

  return {
    availableActions,
    isMyTurn: session.state.currentPlayerId === currentUserUuid,
    phase: session.state.phase,
    isSpectator,
  }
}

export function toActionResponsePayload(args: {
  actionResult: GameActionResponse
  playerView: unknown
  availableActions: string[]
  gameDisplayName?: string
  includeDebugPayload?: boolean
  gamePresentation?: GamePresentationDefinition
}) {
  const {
    actionResult,
    playerView,
    availableActions,
    gameDisplayName,
    includeDebugPayload = false,
    gamePresentation,
  } = args
  const events = Array.isArray(actionResult.events)
    ? actionResult.events.map((event) => ({
        type: event.type,
        payload: includeDebugPayload ? event.payload : undefined,
      }))
    : []

  return {
    success: true,
    gameTitle: gameDisplayName ?? null,
    rendererKind: gamePresentation?.rendererKind ?? null,
    pollingIntervalMs: gamePresentation?.pollingIntervalMs ?? null,
    showReplayDiff: gamePresentation?.showReplayDiff ?? null,
    rendererOptions: gamePresentation?.rendererOptions ?? null,
    playerView: normalizePlayerViewForFrontend(playerView, gamePresentation),
    availableActions,
    events,
    isFinished: actionResult.newState?.isFinished ?? false,
    winnerId: actionResult.newState?.winnerId,
  }
}

export function toPublicPlayersPayload(args: { session: GameSession; currentUserUuid: string }) {
  const { session, currentUserUuid } = args

  const state = session.state as unknown as Record<string, unknown>
  const playersInState = Array.isArray(state.players)
    ? (state.players as Array<Record<string, unknown>>)
    : []

  const players = playersInState.map((player) =>
    toPublicPlayerView(player, session.state.currentPlayerId, currentUserUuid)
  )

  const deckCount = Array.isArray(state.deck) ? state.deck.length : Number(state.deckCount ?? 0)

  return {
    players,
    currentPlayerId: session.state.currentPlayerId,
    phase: session.state.phase,
    round: session.state.round,
    deckCount,
  }
}

export function toSpectatorPlayerView(args: { session: GameSession; currentUserUuid: string }) {
  const { session, currentUserUuid } = args
  const state = session.state as unknown as Record<string, unknown>
  const publicPayload = toPublicPlayersPayload({ session, currentUserUuid })

  return {
    playerId: currentUserUuid,
    isMyTurn: false,
    availableActions: [] as string[],
    state: {
      ...state,
      players: publicPayload.players,
      currentPlayerId: session.state.currentPlayerId,
      phase: session.state.phase,
      round: session.state.round,
      turn: Number(state.turn ?? 0),
      isFinished: session.state.isFinished,
      winnerId: session.state.winnerId ?? null,
      deckCount: publicPayload.deckCount,
      myHand: [] as string[],
    },
  }
}

function normalizePlayerViewForFrontend(
  playerView: unknown,
  gamePresentation?: GamePresentationDefinition
) {
  if (gamePresentation?.playerView !== 'hidden-hand-player-list') {
    return playerView
  }

  const playerViewRecord = asRecord(playerView)
  if (!playerViewRecord) {
    return playerView
  }

  const state = asRecord(playerViewRecord.state)
  if (!state) {
    return playerView
  }

  const currentUserUuid =
    typeof playerViewRecord.playerId === 'string' ? playerViewRecord.playerId : ''
  const currentPlayerId = typeof state.currentPlayerId === 'string' ? state.currentPlayerId : null
  const statePlayers = Array.isArray(state.players) ? state.players : []
  const alreadyNormalized = statePlayers.every((player) => {
    const record = asRecord(player)
    return record !== null && 'handCount' in record
  })

  return {
    ...playerViewRecord,
    state: {
      ...state,
      players: alreadyNormalized
        ? statePlayers
        : statePlayers.map((player) =>
            toPublicPlayerView(asRecord(player) ?? {}, currentPlayerId, currentUserUuid)
          ),
      myHand: Array.isArray(state.myHand)
        ? state.myHand
        : extractMyHand(statePlayers, currentUserUuid),
      deckCount:
        typeof state.deckCount === 'number'
          ? state.deckCount
          : Array.isArray(state.deck)
            ? state.deck.length
            : 0,
    },
  }
}

function extractMyHand(players: unknown[], currentUserUuid: string): string[] {
  const currentPlayer = players
    .map((player) => asRecord(player))
    .find((player) => player && String(player.id ?? '') === currentUserUuid)

  if (!currentPlayer || !Array.isArray(currentPlayer.hand)) {
    return []
  }

  return currentPlayer.hand.filter((card): card is string => typeof card === 'string')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

export function toPublicPlayerView(
  player: Record<string, unknown>,
  currentPlayerId: string | null,
  currentUserUuid: string
) {
  const discardPile = Array.isArray(player.discardPile)
    ? (player.discardPile as Array<string>).map((cardType) => ({
        type: cardType,
        name: cardType,
        value: 0,
      }))
    : []

  const handCount = Array.isArray(player.hand) ? player.hand.length : 0

  return {
    id: String(player.id ?? ''),
    name: String(player.name ?? 'Unknown'),
    isActive: Boolean(player.isActive),
    isEliminated: Boolean(player.isEliminated),
    isProtected: Boolean(player.isProtected),
    handCount,
    discardPile,
    tokensOfAffection: Number(player.tokensOfAffection ?? 0),
    isCurrentPlayer: String(player.id ?? '') === currentPlayerId,
    isMe: String(player.id ?? '') === currentUserUuid,
  }
}
