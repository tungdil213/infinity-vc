import type {
  GameActionResponse,
  GameSession,
} from '../application/services/game_engine_service.js'

export function toGamePagePayload(args: {
  session: GameSession
  playerView: unknown
  availableActions: string[]
  user: { uuid: string; nickName: string }
}) {
  const { session, playerView, availableActions, user } = args

  return {
    gameId: session.gameId,
    gameType: session.gameType,
    playerView,
    availableActions,
    user,
    isFinished: session.state.isFinished,
  }
}

export function toGameApiPayload(args: {
  session: GameSession
  playerView: unknown
  availableActions: string[]
}) {
  const { session, playerView, availableActions } = args

  return {
    gameId: session.gameId,
    gameType: session.gameType,
    playerView,
    availableActions,
    isFinished: session.state.isFinished,
  }
}

export function toGameActionsPayload(args: {
  session: GameSession
  availableActions: string[]
  currentUserUuid: string
}) {
  const { session, availableActions, currentUserUuid } = args

  return {
    availableActions,
    isMyTurn: session.state.currentPlayerId === currentUserUuid,
    phase: session.state.phase,
  }
}

export function toActionResponsePayload(args: {
  actionResult: GameActionResponse
  playerView: unknown
  availableActions: string[]
}) {
  const { actionResult, playerView, availableActions } = args

  return {
    success: true,
    playerView,
    availableActions,
    events: actionResult.events,
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
