import { test } from '@japa/runner'
import { decodeReplayImportPayload } from '../../../app/application/services/replay_import_payload_decoder.js'

const replayTimeline = [
  {
    step: 0,
    kind: 'initial' as const,
    recordedAt: '2026-06-01T10:00:00.000Z',
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
]

function makeEnvelope(payload: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    keyId: 'replay-v1',
    algorithm: 'sha256',
    signedAt: '2026-06-01T10:00:00.000Z',
    payload,
    signature: 'sha256:signature',
  }
}

test.group('decodeReplayImportPayload', () => {
  test('accepts a typed replay timeline and stable signed envelope shape', ({ assert }) => {
    const envelope = makeEnvelope({
      gameId: 'game-1',
      replayTimeline,
    })

    const result = decodeReplayImportPayload({
      replayTimeline,
      envelope,
    })

    assert.isTrue(result.success)
    if (!result.success) {
      throw new Error('expected replay import payload to decode')
    }

    assert.deepEqual(result.value.replayTimeline, replayTimeline)
    assert.deepEqual(result.value.envelope, envelope)
  })

  test('rejects an empty replay timeline with a precise issue', ({ assert }) => {
    const result = decodeReplayImportPayload({
      replayTimeline: [],
      envelope: undefined,
    })

    assert.isFalse(result.success)
    assert.deepInclude(result.issues, {
      path: 'replayTimeline',
      code: 'empty_timeline',
      message: 'Replay timeline must contain at least one step',
    })
  })

  test('rejects malformed replay steps and envelopes before verification', ({ assert }) => {
    const result = decodeReplayImportPayload({
      replayTimeline: [
        {
          step: 1,
          kind: 'action',
          recordedAt: '2026-06-01T10:00:00.000Z',
          events: [{ payload: { move: 'rock' } }],
          snapshot: {
            phase: 'turn',
            round: 1,
            turn: 1,
            isFinished: false,
            winnerId: null,
            currentPlayerId: null,
            players: [],
          },
        },
      ],
      envelope: {
        schemaVersion: 1,
        keyId: '',
        algorithm: 'md5',
        signedAt: '2026-06-01T10:00:00.000Z',
        payload: {},
        signature: '',
      },
    })

    assert.isFalse(result.success)
    assert.deepInclude(result.issues, {
      path: 'replayTimeline[0].events[0].type',
      code: 'expected_non_empty_string',
      message: 'Expected a non-empty string',
    })
    assert.deepInclude(result.issues, {
      path: 'replayTimeline[0].actionType',
      code: 'required_for_action',
      message: 'Action replay steps require actionType',
    })
    assert.deepInclude(result.issues, {
      path: 'envelope.algorithm',
      code: 'unsupported_algorithm',
      message: 'Expected sha256 or sha512',
    })
  })
})
