import { test } from '@japa/runner'
import {
  executeParsedGameAction,
  getGameSession,
  getAuthorizedGameSession,
  isUserInGameSession,
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
    gameType: 'love-letter',
    engine: {} as any,
    createdAt: new Date(),
    players: playerIds.map((id) => ({ id, name: `Player-${id}`, isActive: true })),
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
  test('getGameSession should return null when game does not exist', ({ assert }) => {
    const session = getGameSession('missing-game', () => undefined)

    assert.isNull(session)
  })

  test('isUserInGameSession should detect player membership', ({ assert }) => {
    const session = makeSession(['user-a'])

    assert.isTrue(isUserInGameSession(session, 'user-a'))
    assert.isFalse(isUserInGameSession(session, 'user-b'))
  })

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
        executeAction: () => ({ success: false }),
      }
    )

    assert.isTrue(drawCalled)
    assert.deepEqual(result, drawResult)
  })

  test('parseGameActionInput should parse submit_move action', ({ assert }) => {
    const parsed = parseGameActionInput({ actionType: 'submit_move', move: 'rock' })

    assert.deepEqual(parsed, {
      ok: true,
      value: {
        type: 'engine',
        actionType: 'submit_move',
        payload: { move: 'rock' },
      },
    })
  })
})
