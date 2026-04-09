import { test } from '@japa/runner'
import {
  planReplaySignatureBackfill,
  type ReplaySignatureBackfillPayload,
} from '../../../app/application/services/replay_snapshot_signature_backfill.js'

const TIMELINE = [
  {
    step: 0,
    kind: 'initial',
    recordedAt: '2026-04-07T10:00:00.000Z',
    events: [],
    snapshot: {
      phase: 'setup',
      round: 1,
      turn: 0,
      isFinished: false,
      winnerId: null,
      currentPlayerId: null,
      players: [],
    },
  },
] as any

function makeEnvelopeSigner() {
  return (payload: ReplaySignatureBackfillPayload) => ({
    schemaVersion: 1 as const,
    keyId: 'replay-v1',
    algorithm: 'sha256' as const,
    signedAt: '2026-04-07T12:00:00.000Z',
    payload,
    signature: 'sha256:abcdef',
  })
}

test.group('planReplaySignatureBackfill', () => {
  test('creates update plan for unsigned replay timeline', ({ assert }) => {
    const gameData = {
      currentRound: 1,
      currentTurn: 0,
      eliminatedPlayers: [],
      playerHands: {},
      discardPile: [],
      deck: { remaining: 1 },
      runtime: {
        replayTimeline: TIMELINE,
      },
    }

    const plan = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData,
      signReplayPayload: makeEnvelopeSigner(),
      nowIso: '2026-04-07T13:00:00.000Z',
    })

    assert.equal(plan.action, 'update')
    if (plan.action !== 'update') {
      return
    }

    assert.equal(plan.reason, 'signed')
    assert.equal(plan.replayStepCount, 1)
    assert.equal(plan.envelopeKeyId, 'replay-v1')
    const runtime = (plan.nextGameData.runtime ?? {}) as Record<string, unknown>
    assert.equal(runtime.persistedAt, '2026-04-07T13:00:00.000Z')
    assert.isDefined(runtime.replayEnvelope)
    assert.notProperty(gameData.runtime, 'replayEnvelope')
  })

  test('skips already signed snapshots when forceResign is disabled', ({ assert }) => {
    const plan = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: {
        runtime: {
          replayTimeline: TIMELINE,
          replayEnvelope: { signature: 'sha256:old' },
        },
      },
      signReplayPayload: makeEnvelopeSigner(),
    })

    assert.deepEqual(plan, {
      action: 'skip',
      reason: 'already_signed',
    })
  })

  test('resigns snapshots when forceResign is enabled', ({ assert }) => {
    const plan = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: {
        runtime: {
          replayTimeline: TIMELINE,
          replayEnvelope: { signature: 'sha256:old' },
        },
      },
      forceResign: true,
      signReplayPayload: makeEnvelopeSigner(),
    })

    assert.equal(plan.action, 'update')
    if (plan.action !== 'update') {
      return
    }

    assert.equal(plan.reason, 'resigned')
    assert.equal(plan.envelopeKeyId, 'replay-v1')
  })

  test('skips when runtime or timeline are missing', ({ assert }) => {
    const withoutRuntime = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: {},
      signReplayPayload: makeEnvelopeSigner(),
    })
    assert.deepEqual(withoutRuntime, {
      action: 'skip',
      reason: 'missing_runtime',
    })

    const withoutTimeline = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: {
        runtime: {},
      },
      signReplayPayload: makeEnvelopeSigner(),
    })
    assert.deepEqual(withoutTimeline, {
      action: 'skip',
      reason: 'missing_replay_timeline',
    })
  })

  test('skips when signer is unavailable', ({ assert }) => {
    const plan = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: {
        runtime: {
          replayTimeline: TIMELINE,
        },
      },
      signReplayPayload: () => null,
    })

    assert.deepEqual(plan, {
      action: 'skip',
      reason: 'signing_unavailable',
    })
  })

  test('skips invalid gameData payloads', ({ assert }) => {
    const plan = planReplaySignatureBackfill({
      gameId: 'game-1',
      gameData: 'not-an-object',
      signReplayPayload: makeEnvelopeSigner(),
    })

    assert.deepEqual(plan, {
      action: 'skip',
      reason: 'invalid_game_data',
    })
  })
})
