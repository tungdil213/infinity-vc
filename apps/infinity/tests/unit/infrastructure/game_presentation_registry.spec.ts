import { test } from '@japa/runner'
import {
  resolveGameDisplayName,
  resolveGamePresentation,
} from '../../../app/infrastructure/game_engine/game_presentation_registry.js'

test.group('game_presentation_registry', () => {
  test('should resolve presentation from registered game modules', ({ assert }) => {
    const presentation = resolveGamePresentation('love-letter-infinity-gauntlet')

    assert.deepEqual(presentation, {
      playerView: 'hidden-hand-player-list',
      rendererKind: 'turn-based-card-hand',
      pollingIntervalMs: 5000,
      showReplayDiff: true,
      rendererOptions: {
        sections: {
          players: 'Players',
          hand: 'Your Hand',
          actions: 'Actions',
          replay: 'Replay Timeline',
          spectator: 'Spectator View',
          guess: 'Guess a Card',
        },
        summary: {
          roundResult: 'Round Result',
        },
      },
    })
    assert.equal(
      resolveGameDisplayName('love-letter-infinity-gauntlet'),
      'Love Letter Infinity Gauntlet'
    )
  })

  test('should keep legacy presentation fallbacks during migration', ({ assert }) => {
    const presentation = resolveGamePresentation('love-letter')

    assert.deepEqual(presentation, {
      playerView: 'hidden-hand-player-list',
      rendererKind: 'turn-based-card-hand',
      pollingIntervalMs: 5000,
      showReplayDiff: true,
      rendererOptions: {
        sections: {
          players: 'Players',
          hand: 'Your Hand',
          actions: 'Actions',
          replay: 'Replay Timeline',
          spectator: 'Spectator View',
          guess: 'Guess a Card',
        },
        summary: {
          roundResult: 'Round Result',
        },
      },
    })
    assert.equal(resolveGameDisplayName('love-letter'), 'Love Letter Infinity Gauntlet')
  })
})
