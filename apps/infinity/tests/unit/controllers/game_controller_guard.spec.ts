import { test } from '@japa/runner'
import {
  executeParsedGameAction,
  getAuthorizedGameSession,
  parseGameActionInput,
} from '../../../app/controllers/support/game_controller_guard.js'
import type {
  GameActionResponse,
  GameSession,
} from '../../../app/application/services/game_engine_service.js'

function makeSession(playerIds: string[]): GameSession {
  return {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    engine: {} as any,
    createdAt: new Date(),
    state: {
      currentPlayerId: playerIds[0] ?? null,
      players: playerIds.map((id) => ({
        id,
        name: `Player-${id}`,
        isActive: true,
        isEliminated: false,
        isProtected: false,
        hand: [],
        discardPile: [],
        tokensOfAffection: 0,
      })),
      phase: 'play',
      round: 1,
      deck: [],
      isFinished: false,
      winnerId: null,
    } as any,
  }
}

test.group('game_controller_guard', () => {
  test('getAuthorizedGameSession should return null when player is not in game', ({ assert }) => {
    const session = makeSession(['user-a'])

    const authorized = getAuthorizedGameSession('game-1', 'user-b', () => session)

    assert.isNull(authorized)
  })

  test('parseGameActionInput should validate play action cardType', ({ assert }) => {
    const parsed = parseGameActionInput({ action: 'play' })

    assert.deepEqual(parsed, { ok: false, error: 'cardType is required' })
  })

  test('executeParsedGameAction should call draw dependency for draw action', ({ assert }) => {
    let drawCalled = false

    const drawResult: GameActionResponse = { success: true }
    const result = executeParsedGameAction(
      'game-1',
      'user-a',
      { type: 'draw' },
      {
        drawCard: () => {
          drawCalled = true
          return drawResult
        },
        playCard: () => ({ success: false }),
      }
    )

    assert.isTrue(drawCalled)
    assert.deepEqual(result, drawResult)
  })
})
