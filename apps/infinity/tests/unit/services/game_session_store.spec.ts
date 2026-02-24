import { test } from '@japa/runner'
import { GameSessionStore } from '../../../app/application/services/game_session_store.js'
import type { GameSession } from '../../../app/application/services/game_engine_types.js'

function makeSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    gameType: 'love-letter',
    engine: {} as any,
    createdAt: new Date(),
    players: [],
    state: {
      isFinished: false,
      winnerId: null,
      players: [],
      deck: [],
      phase: 'play',
      round: 1,
      currentPlayerId: null,
    } as any,
    ...overrides,
  }
}

test.group('GameSessionStore', () => {
  test('should save and retrieve a session', ({ assert }) => {
    const store = new GameSessionStore()
    const session = makeSession()

    store.save(session)

    assert.equal(store.get(session.gameId)?.gameId, session.gameId)
  })

  test('should update session state', ({ assert }) => {
    const store = new GameSessionStore()
    const session = makeSession()
    store.save(session)

    const nextState = { ...session.state, isFinished: true } as any
    store.updateState(session.gameId, nextState)

    assert.equal(store.get(session.gameId)?.state.isFinished, true)
  })

  test('should find session by lobby id', ({ assert }) => {
    const store = new GameSessionStore()
    const session = makeSession({ gameId: 'game-2', lobbyId: 'lobby-42' })
    store.save(session)

    const found = store.getByLobbyId('lobby-42')

    assert.equal(found?.gameId, 'game-2')
  })
})
