import { test } from '@japa/runner'
import type { ReplayStep } from '../../../inertia/games/game_renderer_types.js'
import {
  computeReplayDiff,
  describeGameReplayEvent,
  formatGameDebugPayload,
  resolveGamePlayerLabel,
} from '../../../inertia/games/game_replay_helpers.js'

function makeReplayStep(overrides?: Partial<ReplayStep>): ReplayStep {
  return {
    step: overrides?.step ?? 1,
    kind: overrides?.kind ?? 'action',
    recordedAt: overrides?.recordedAt ?? '2026-04-09T12:00:00.000Z',
    actorId: overrides?.actorId ?? 'player-1',
    actionType: overrides?.actionType ?? 'draw_card',
    actionPayload: overrides?.actionPayload ?? {},
    events: overrides?.events ?? [],
    snapshot: {
      phase: overrides?.snapshot?.phase ?? 'draw',
      round: overrides?.snapshot?.round ?? 1,
      turn: overrides?.snapshot?.turn ?? 1,
      isFinished: overrides?.snapshot?.isFinished ?? false,
      winnerId: overrides?.snapshot?.winnerId ?? null,
      currentPlayerId: overrides?.snapshot?.currentPlayerId ?? 'player-1',
      players: overrides?.snapshot?.players ?? [],
      scores: overrides?.snapshot?.scores,
      roundChoices: overrides?.snapshot?.roundChoices,
      rounds: overrides?.snapshot?.rounds,
    },
  }
}

test.group('game_replay_helpers', () => {
  test('should compute an initial replay diff when no previous step exists', ({ assert }) => {
    const diff = computeReplayDiff(
      makeReplayStep({
        snapshot: {
          phase: 'draw',
          round: 1,
          turn: 1,
          isFinished: false,
          winnerId: null,
          currentPlayerId: 'player-1',
          players: [],
        },
      }),
      null
    )

    assert.exists(diff)
    assert.equal(diff?.hasPreviousStep, false)
    assert.equal(diff?.currentPhase, 'draw')
    assert.equal(diff?.currentCurrentPlayerId, 'player-1')
    assert.deepEqual(diff?.scoreChanges, [])
  })

  test('should compute replay deltas between two steps', ({ assert }) => {
    const previousStep = makeReplayStep({
      snapshot: {
        phase: 'draw',
        round: 1,
        turn: 1,
        isFinished: false,
        winnerId: null,
        currentPlayerId: 'player-1',
        players: [],
        scores: { 'player-1': 1, 'player-2': 0 },
      },
    })
    const currentStep = makeReplayStep({
      snapshot: {
        phase: 'play',
        round: 1,
        turn: 2,
        isFinished: true,
        winnerId: 'player-2',
        currentPlayerId: 'player-2',
        players: [],
        scores: { 'player-1': 1, 'player-2': 1 },
      },
    })

    const diff = computeReplayDiff(currentStep, previousStep)

    assert.exists(diff)
    assert.equal(diff?.hasPreviousStep, true)
    assert.equal(diff?.phaseChanged, true)
    assert.equal(diff?.currentPlayerChanged, true)
    assert.equal(diff?.finishedChanged, true)
    assert.deepEqual(diff?.scoreDeltaByPlayerId, { 'player-2': 1 })
    assert.equal(diff?.scoreChanges[0].playerId, 'player-2')
  })

  test('should resolve player labels from viewer, replay snapshot or current state', ({
    assert,
  }) => {
    assert.equal(
      resolveGamePlayerLabel({
        playerId: 'player-1',
        currentUserId: 'player-1',
      }),
      'You'
    )

    assert.equal(
      resolveGamePlayerLabel({
        playerId: 'player-2',
        currentUserId: 'player-1',
        replayPlayers: [
          {
            id: 'player-2',
            name: 'Nebula',
            isActive: true,
            isEliminated: false,
            isProtected: false,
            handCount: 1,
            tokensOfAffection: 0,
          },
        ],
      }),
      'Nebula'
    )

    assert.equal(
      resolveGamePlayerLabel({
        playerId: 'player-3',
        currentUserId: 'player-1',
        currentPlayers: [
          {
            id: 'player-3',
            name: 'Gamora',
          },
        ],
      }),
      'Gamora'
    )

    assert.equal(
      resolveGamePlayerLabel({
        playerId: null,
        currentUserId: 'player-1',
      }),
      'Unknown player'
    )
  })

  test('should describe replay events with actor and target labels', ({ assert }) => {
    const description = describeGameReplayEvent({
      event: {
        type: 'card.played',
        payload: {
          playerId: 'player-1',
          targetPlayerId: 'player-2',
        },
      },
      getPlayerLabel: (playerId?: string | null) => {
        if (playerId === 'player-1') {
          return 'You'
        }

        if (playerId === 'player-2') {
          return 'Nebula'
        }

        return 'Unknown'
      },
    })

    assert.equal(description, 'card.played by You targeting Nebula')
    assert.equal(
      describeGameReplayEvent({
        event: {
          type: 'round.started',
          payload: null,
        },
        getPlayerLabel: () => 'Unused',
      }),
      'round.started'
    )
  })

  test('should format debug payloads safely', ({ assert }) => {
    assert.equal(formatGameDebugPayload(undefined), 'No debug payload')

    const circular: Record<string, unknown> = {}
    circular.self = circular

    assert.equal(formatGameDebugPayload(circular), 'Unable to render payload')
  })
})
