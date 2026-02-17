import type {
  GameActionResponse,
  GameSession,
} from '../../application/services/game_engine_service.js'

export interface RawGameActionInput {
  action?: string
  cardType?: string
  targetPlayerId?: string
  guessedCard?: string
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

export function getAuthorizedGameSession(
  gameUuid: string,
  userUuid: string,
  getSession: (gameUuid: string) => GameSession | undefined
): GameSession | null {
  const session = getSession(gameUuid)
  if (!session) {
    return null
  }

  const isPlayerInGame = session.state.players.some((player) => player.id === userUuid)
  return isPlayerInGame ? session : null
}

export function parseGameActionInput(
  input: RawGameActionInput
): { ok: true; value: ParsedGameAction } | { ok: false; error: string } {
  switch (input.action) {
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
    default:
      return { ok: false, error: `Unknown action: ${input.action}` }
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
  }
): GameActionResponse {
  if (action.type === 'draw') {
    return deps.drawCard(gameUuid, userUuid)
  }

  return deps.playCard(
    gameUuid,
    userUuid,
    action.cardType,
    action.targetPlayerId,
    action.guessedCard
  )
}
