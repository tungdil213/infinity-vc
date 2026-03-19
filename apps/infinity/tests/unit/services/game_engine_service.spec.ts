import { test } from '@japa/runner'
import { GameEngineService } from '../../../app/application/services/game_engine_service.js'
import { GameSessionStore } from '../../../app/application/services/game_session_store.js'
import type {
  GameActionRequest,
  GameSession,
} from '../../../app/application/services/game_engine_types.js'
import { RpsActionTypes } from '@infinity.dev/game-engine'
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
    gameType: 'love-letter',
    createdAt: new Date(),
    players: [],
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
  test('createGame should create and persist a session', async ({ assert }) => {
    const sessionStore = new GameSessionStore()
    const calls: string[] = []
    const publisher = {
      publishGameStarted: () => {
        calls.push('started')
      },
      publishActionEvents: () => {},
      publishGameFinished: () => {},
      publishSessionEnded: () => {},
    }

    const service = new GameEngineService(sessionStore, publisher as any)
    const result = await service.createGame(
      'lobby-rps',
      [
        { uuid: 'user-1', nickName: 'Alice' },
        { uuid: 'user-2', nickName: 'Bob' },
      ],
      'rock-paper-scissors',
      { roundsToWin: 2 }
    )

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.gameType, 'rock-paper-scissors')
    assert.isDefined(service.getSession(result.value.gameId))
    assert.lengthOf(result.value.timeline || [], 1)
    assert.deepEqual(calls, ['started'])
  })

  test('createGame should fail for unknown game type', async ({ assert }) => {
    const service = new GameEngineService(new GameSessionStore(), {
      publishGameStarted: () => {},
      publishActionEvents: () => {},
      publishGameFinished: () => {},
      publishSessionEnded: () => {},
    } as any)

    const result = await service.createGame(
      'lobby-unknown',
      [
        { uuid: 'user-1', nickName: 'Alice' },
        { uuid: 'user-2', nickName: 'Bob' },
      ],
      'unknown-game'
    )

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Unknown game')
  })

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
    assert.lengthOf(service.getReplayTimeline('game-1'), 1)
  })

  test('submitMove should delegate to executeAction with submit_move payload', ({ assert }) => {
    const service = new GameEngineService(new GameSessionStore(), {
      publishGameStarted: () => {},
      publishActionEvents: () => {},
      publishGameFinished: () => {},
      publishSessionEnded: () => {},
    } as any)

    let capturedRequest: GameActionRequest | null = null
    service.executeAction = ((request: GameActionRequest) => {
      capturedRequest = request
      return { success: true }
    }) as any

    const result = service.submitMove('game-rps', 'user-rps', 'rock')

    assert.equal(result.success, true)
    assert.deepEqual(capturedRequest, {
      gameId: 'game-rps',
      playerId: 'user-rps',
      actionType: RpsActionTypes.SUBMIT_MOVE,
      payload: { move: 'rock' },
    })
  })

  test('restoreGameSession should restore a persisted state when session is missing', async ({
    assert,
  }) => {
    const sessionStore = new GameSessionStore()
    const service = new GameEngineService(sessionStore, {
      publishGameStarted: () => {},
      publishActionEvents: () => {},
      publishGameFinished: () => {},
      publishSessionEnded: () => {},
    } as any)

    const created = await service.createGame(
      'lobby-rps-restore',
      [
        { uuid: 'player-1', nickName: 'Alice' },
        { uuid: 'player-2', nickName: 'Bob' },
      ],
      'rock-paper-scissors',
      { roundsToWin: 2 }
    )

    assert.isTrue(created.isSuccess)
    const createdSession = created.value
    const persistedState = createdSession.state as unknown as Record<string, unknown>

    service.endGame(createdSession.gameId)
    assert.isUndefined(service.getSession(createdSession.gameId))

    const restored = await service.restoreGameSession({
      gameId: createdSession.gameId,
      lobbyId: createdSession.lobbyId,
      gameType: createdSession.gameType,
      players: [
        { uuid: 'player-1', nickName: 'Alice' },
        { uuid: 'player-2', nickName: 'Bob' },
      ],
      engineState: persistedState,
      gameSettings: { roundsToWin: 2 },
      startedAt: createdSession.createdAt,
      replayTimeline: createdSession.timeline,
    })

    assert.isTrue(restored.isSuccess)
    assert.equal(restored.value.gameId, createdSession.gameId)
    assert.equal(restored.value.gameType, 'rock-paper-scissors')
    assert.lengthOf(restored.value.timeline || [], createdSession.timeline?.length || 0)
    assert.isDefined(service.getSession(createdSession.gameId))
  })
})
