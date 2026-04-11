import { test } from '@japa/runner'
import {
  resolveGameReplayMove,
  resolveInitialGameReplayCursor,
  resolveSyncedGameReplayCursor,
} from '../../../inertia/hooks/use_game_replay.js'

test.group('use_game_replay', () => {
  test('resolveInitialGameReplayCursor targets the latest step or zero when empty', ({
    assert,
  }) => {
    assert.equal(resolveInitialGameReplayCursor(0), 0)
    assert.equal(resolveInitialGameReplayCursor(1), 0)
    assert.equal(resolveInitialGameReplayCursor(5), 4)
  })

  test('resolveGameReplayMove clamps the cursor and updates pinning consistently', ({ assert }) => {
    assert.deepEqual(
      resolveGameReplayMove({
        nextCursor: 99,
        timelineLength: 4,
        previousIsReplayPinnedToLatest: false,
      }),
      {
        replayCursor: 3,
        isReplayPinnedToLatest: true,
      }
    )

    assert.deepEqual(
      resolveGameReplayMove({
        nextCursor: -5,
        timelineLength: 4,
        previousIsReplayPinnedToLatest: true,
      }),
      {
        replayCursor: 0,
        isReplayPinnedToLatest: false,
      }
    )

    assert.deepEqual(
      resolveGameReplayMove({
        nextCursor: 2,
        timelineLength: 0,
        previousIsReplayPinnedToLatest: true,
      }),
      {
        replayCursor: 0,
        isReplayPinnedToLatest: true,
      }
    )
  })

  test('resolveSyncedGameReplayCursor keeps the latest step pinned and clamps stale cursors', ({
    assert,
  }) => {
    assert.equal(
      resolveSyncedGameReplayCursor({
        currentCursor: 1,
        timelineLength: 5,
        isReplayPinnedToLatest: true,
      }),
      4
    )

    assert.equal(
      resolveSyncedGameReplayCursor({
        currentCursor: 9,
        timelineLength: 5,
        isReplayPinnedToLatest: false,
      }),
      4
    )

    assert.equal(
      resolveSyncedGameReplayCursor({
        currentCursor: 2,
        timelineLength: 0,
        isReplayPinnedToLatest: false,
      }),
      0
    )
  })
})
