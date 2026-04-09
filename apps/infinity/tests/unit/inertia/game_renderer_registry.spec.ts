import { test } from '@japa/runner'
import {
  resolveGameRenderer,
  resolveRendererKind,
  resolveRendererOptions,
} from '../../../inertia/games/game_renderer_registry.js'

test.group('game_renderer_registry', () => {
  test('should resolve renderer from an explicit rendererKind', ({ assert }) => {
    const renderer = resolveGameRenderer({
      rendererKind: 'simultaneous-choice',
      gameType: 'custom-slug',
    })

    assert.exists(renderer)
    assert.equal(renderer?.kind, 'simultaneous-choice')
    assert.equal(renderer?.pollingIntervalMs, 3000)
  })

  test('should keep legacy gameType fallbacks for older payloads', ({ assert }) => {
    assert.equal(
      resolveRendererKind({ rendererKind: null, gameType: 'love-letter' }),
      'turn-based-card-hand'
    )
    assert.equal(
      resolveRendererKind({ rendererKind: null, gameType: 'rock-paper-scissors' }),
      'simultaneous-choice'
    )
  })

  test('should merge family defaults with renderer-specific overrides', ({ assert }) => {
    const options = resolveRendererOptions({
      rendererKind: 'turn-based-card-hand',
      rendererOptions: {
        sections: {
          hand: 'Main secrète',
        },
      },
    })

    assert.deepEqual(options, {
      sections: {
        players: 'Players',
        hand: 'Main secrète',
        actions: 'Actions',
        replay: 'Replay Timeline',
        spectator: 'Spectator View',
        guess: 'Guess a Card',
      },
      summary: {
        roundResult: 'Round Result',
      },
    })
  })
})
