import { test } from '@japa/runner'
import Game from '../../../app/domain/entities/game.js'
import { GameStatus } from '../../../app/domain/value_objects/game_status.js'

function makePlayers() {
  return [
    { uuid: 'player-1', nickName: 'Alice' },
    { uuid: 'player-2', nickName: 'Bob' },
  ]
}

test.group('Game Entity', () => {
  test('should create an in-progress game by default', ({ assert }) => {
    const game = Game.create({ players: makePlayers() as any })

    assert.equal(game.status, GameStatus.IN_PROGRESS)
    assert.equal(game.isFinished, false)
  })

  test('should transition to abandoned and mark game as completed', ({ assert }) => {
    const game = Game.create({ players: makePlayers() as any })

    game.abandonGame('player-1', 'manual_forfeit')

    assert.equal(game.status, GameStatus.ABANDONED)
    assert.equal(game.isFinished, true)
    assert.exists(game.finishedAt)
    assert.equal(game.gameData.runtime?.abandonedBy, 'player-1')
    assert.equal(game.gameData.runtime?.abandonReason, 'manual_forfeit')
  })

  test('should not abandon an already finished game', ({ assert }) => {
    const game = Game.create({ players: makePlayers() as any })
    game.finishGame('player-1')

    assert.throws(() => {
      game.abandonGame('player-2', 'late_forfeit')
    })
  })
})
