import type { GameActionResponse, GameSession } from '#application/services/game_engine_service'

export interface RawGameActionInput {
  action?: string
  actionType?: string
  cardType?: string
  targetPlayerId?: string
  guessedCard?: string
  move?: string
  payload?: Record<string, unknown>
}

export type ParsedGameAction =
  | {
      type: 'draw'
    }
  | {
      type: 'play'
      cardType: string
      targetPlayerId?: string
      guessedCard?: string
    }
  | {
      type: 'engine'
      actionType: string
      payload?: Record<string, unknown>
}

export function getGameSession(
  gameUuid: string,
  getSession: (gameUuid: string) => GameSession | undefined
): GameSession | null {
  const session = getSession(gameUuid)
  return session || null
}

export function isUserInGameSession(session: GameSession, userUuid: string): boolean {
  return session.state.players.some((player) => player.id === userUuid)
}

export function getAuthorizedGameSession(
  gameUuid: string,
  userUuid: string,
  getSession: (gameUuid: string) => GameSession | undefined
): GameSession | null {
  const session = getGameSession(gameUuid, getSession)
  if (!session) {
    return null
  }

  const isPlayerInGame = isUserInGameSession(session, userUuid)
  return isPlayerInGame ? session : null
}

export function parseGameActionInput(
  input: RawGameActionInput
): { ok: true; value: ParsedGameAction } | { ok: false; error: string } {
  const actionType = input.actionType ?? input.action

  switch (actionType) {
    case 'draw':
      return { ok: true, value: { type: 'draw' } }
    case 'play':
      if (!input.cardType) {
        return { ok: false, error: 'cardType is required' }
      }

      return {
        ok: true,
        value: {
          type: 'play',
          cardType: input.cardType,
          targetPlayerId: input.targetPlayerId,
          guessedCard: input.guessedCard,
        },
      }
    case 'submit_move': {
      const move = input.move
      if (!move) {
        return { ok: false, error: 'move is required' }
      }

      return {
        ok: true,
        value: {
          type: 'engine',
          actionType,
          payload: { move },
        },
      }
    }
    default:
      if (!actionType) {
        return { ok: false, error: 'action is required' }
      }

      return {
        ok: true,
        value: {
          type: 'engine',
          actionType,
          payload: input.payload,
        },
      }
  }
}

export function executeParsedGameAction(
  gameUuid: string,
  userUuid: string,
  action: ParsedGameAction,
  deps: {
    drawCard: (gameUuid: string, userUuid: string) => GameActionResponse
    playCard: (
      gameUuid: string,
      userUuid: string,
      cardType: string,
      targetPlayerId?: string,
      guessedCard?: string
    ) => GameActionResponse
    executeAction: (request: {
      gameId: string
      playerId: string
      actionType: string
      payload?: Record<string, unknown>
    }) => GameActionResponse
  }
): GameActionResponse {
  if (action.type === 'draw') {
    return deps.drawCard(gameUuid, userUuid)
  }

  if (action.type === 'engine') {
    return deps.executeAction({
      gameId: gameUuid,
      playerId: userUuid,
      actionType: action.actionType,
      payload: action.payload,
    })
  }

  return deps.playCard(
    gameUuid,
    userUuid,
    action.cardType,
    action.targetPlayerId,
    action.guessedCard
  )
}
