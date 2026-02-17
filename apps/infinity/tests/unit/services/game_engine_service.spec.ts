import { test } from '@japa/runner'
import { GameEngineService } from '../../../app/application/services/game_engine_service.js'
import { GameSessionStore } from '../../../app/application/services/game_session_store.js'
import type { GameSession } from '../../../app/application/services/game_engine_types.js'
import { LoveLetterActionTypes } from '../../../app/games/love-letter/types.js'

function makeSession(): GameSession {
  const initialState = {
    isFinished: false,
    winnerId: null,
    players: [],
    deck: [],
    phase: 'play',
    round: 1,
    currentPlayerId: 'user-1',
  } as any

  const nextState = {
    ...initialState,
    isFinished: true,
    winnerId: 'user-1',
  }

  return {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    createdAt: new Date(),
    state: initialState,
    engine: {
      validateAction: () => ({ isFailure: false }),
      executeAction: () => ({
        isFailure: false,
        value: {
          newState: nextState,
          events: [{ type: 'turn.changed', payload: { from: 'u1', to: 'u2' } }],
        },
      }),
      getPlayerView: () => null,
      getAvailableActions: () => [],
    } as any,
  }
}

test.group('GameEngineService', () => {
  test('executeAction should return not found when session does not exist', ({ assert }) => {
    const service = new GameEngineService(new GameSessionStore(), {
      publishGameStarted: () => {},
      publishActionEvents: () => {},
      publishGameFinished: () => {},
      publishSessionEnded: () => {},
    } as any)

    const result = service.executeAction({
      gameId: 'missing',
      playerId: 'user-1',
      actionType: LoveLetterActionTypes.DRAW_CARD,
    })

    assert.equal(result.success, false)
    assert.equal(result.error, 'Game not found')
  })

  test('executeAction should update session state and publish events', ({ assert }) => {
    const sessionStore = new GameSessionStore()
    const session = makeSession()
    sessionStore.save(session)

    const calls: string[] = []
    const publisher = {
      publishGameStarted: () => {},
      publishActionEvents: (
        _gameId: string,
        _events: Array<{ type: string; payload: unknown }>
      ) => {
        calls.push('action')
      },
      publishGameFinished: (_gameId: string, _winnerId: string | null) => {
        calls.push('finished')
      },
      publishSessionEnded: () => {},
    }

    const service = new GameEngineService(sessionStore, publisher as any)

    const result = service.executeAction({
      gameId: 'game-1',
      playerId: 'user-1',
      actionType: LoveLetterActionTypes.PLAY_CARD,
      payload: { cardType: 'guard' },
    })

    assert.equal(result.success, true)
    assert.equal(result.newState?.isFinished, true)
    assert.deepEqual(calls, ['action', 'finished'])
    assert.equal(service.getSession('game-1')?.state.isFinished, true)
  })
})
