import type {
  GameActionResponse,
  GameSession,
} from '../application/services/game_engine_service.js'
import { Cards } from '../games/love-letter/types.js'

export function toGamePagePayload(args: {
  session: GameSession
  playerView: unknown
  availableActions: string[]
  user: { uuid: string; nickName: string }
}) {
  const { session, playerView, availableActions, user } = args

  return {
    gameId: session.gameId,
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

  const players = session.state.players.map((player) =>
    toPublicPlayerView(player, session.state.currentPlayerId, currentUserUuid)
  )

  return {
    players,
    currentPlayerId: session.state.currentPlayerId,
    phase: session.state.phase,
    round: session.state.round,
    deckCount: session.state.deck.length,
  }
}

export function toPublicPlayerView(
  player: GameSession['state']['players'][number],
  currentPlayerId: string | null,
  currentUserUuid: string
) {
  return {
    id: player.id,
    name: player.name,
    isActive: player.isActive,
    isEliminated: player.isEliminated,
    isProtected: player.isProtected,
    handCount: player.hand.length,
    discardPile: player.discardPile.map((cardType) => ({
      type: cardType,
      name: Cards[cardType].name,
      value: Cards[cardType].value,
    })),
    tokensOfAffection: player.tokensOfAffection,
    isCurrentPlayer: player.id === currentPlayerId,
    isMe: player.id === currentUserUuid,
  }
}
