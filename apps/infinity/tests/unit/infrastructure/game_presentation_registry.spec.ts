import { test } from '@japa/runner'
import { resolveGamePresentation } from '../../../app/infrastructure/game_engine/game_presentation_registry.js'

test.group('game_presentation_registry', () => {
  test('should resolve presentation from registered game modules', ({ assert }) => {
    const presentation = resolveGamePresentation('love-letter-infinity-gauntlet')

    assert.deepEqual(presentation, {
      playerView: 'hidden-hand-player-list',
    })
  })

  test('should keep legacy presentation fallbacks during migration', ({ assert }) => {
    const presentation = resolveGamePresentation('love-letter')

    assert.deepEqual(presentation, {
      playerView: 'hidden-hand-player-list',
    })
  })
})
