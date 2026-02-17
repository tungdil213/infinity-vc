import { test } from '@japa/runner'
import { GameEngineEventPublisher } from '../../../app/application/services/game_engine_event_publisher.js'
import type { GameSession } from '../../../app/application/services/game_engine_types.js'

function makeSession(): GameSession {
  return {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    engine: {} as any,
    createdAt: new Date(),
    state: {
      isFinished: false,
      winnerId: null,
      players: [],
      deck: [],
      phase: 'play',
      round: 1,
      currentPlayerId: null,
    } as any,
  }
}

test.group('GameEngineEventPublisher', () => {
  test('should publish game.started event', async ({ assert }) => {
    const published: Array<{ type: string; payload: any }> = []
    const bus = {
      publish: async (event: any) => {
        published.push(event)
      },
      subscribe: () => {},
      unsubscribe: () => {},
      clear: () => {},
    }

    const publisher = new GameEngineEventPublisher(bus as any)
    publisher.publishGameStarted(makeSession(), [{ uuid: 'u1', nickName: 'N1' }])

    await Promise.resolve()

    assert.equal(published[0].type, 'game.started')
    assert.equal(published[0].payload.gameId, 'game-1')
    assert.equal(published[0].payload.players[0].uuid, 'u1')
  })

  test('should prefix action events with game.', async ({ assert }) => {
    const published: Array<{ type: string; payload: any }> = []
    const bus = {
      publish: async (event: any) => {
        published.push(event)
      },
      subscribe: () => {},
      unsubscribe: () => {},
      clear: () => {},
    }

    const publisher = new GameEngineEventPublisher(bus as any)
    publisher.publishActionEvents('game-2', [{ type: 'card.played', payload: { card: 'guard' } }])

    await Promise.resolve()

    assert.equal(published[0].type, 'game.card.played')
    assert.equal(published[0].payload.gameId, 'game-2')
  })
})
