import { test } from '@japa/runner'
import { StableEnvelopeSigner } from '@infinity.dev/boardgame-toolkit/serialization'
import {
  ReplayImportGuard,
  ReplayImportGuardMetrics,
  type ReplayImportGuardAuditEntry,
} from '../../../app/application/services/replay_import_guard.js'

const REPLAY_PAYLOAD = {
  gameId: 'game-1',
  replayTimeline: [
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
  ],
} as Record<string, unknown>

function createSigner() {
  return new StableEnvelopeSigner([
    {
      id: 'k1',
      secret: 'test-secret',
      algorithm: 'sha256',
    },
  ])
}

function tamperEnvelopeSignature(signature: string): string {
  const parts = signature.split(':')
  const digest = parts.length > 1 ? parts[1] : signature
  const first = digest[0] === 'a' ? 'b' : 'a'
  const tamperedDigest = `${first}${digest.slice(1)}`
  return parts.length > 1 ? `${parts[0]}:${tamperedDigest}` : tamperedDigest
}

test.group('ReplayImportGuard', () => {
  test('accepts replay without envelope when envelope is optional', ({ assert }) => {
    const metrics = new ReplayImportGuardMetrics()
    const guard = new ReplayImportGuard({ signer: createSigner(), metrics })

    const decision = guard.evaluate({
      operation: 'replay',
      actorId: 'player-1',
      targetId: 'game-1',
      source: 'memory',
      payload: REPLAY_PAYLOAD,
      envelope: null,
    })

    assert.isTrue(decision.allowed)
    assert.equal(decision.reason, null)
    assert.deepEqual(guard.metricsSnapshot(), {
      accepted: 1,
      rejected: 0,
      rejectedByReason: {},
      byOperation: {
        replay: {
          accepted: 1,
          rejected: 0,
          rejectedByReason: {},
        },
      },
      bySource: {
        memory: {
          accepted: 1,
          rejected: 0,
          rejectedByReason: {},
        },
      },
    })
  })

  test('rejects import when envelope is missing and required', ({ assert }) => {
    const metrics = new ReplayImportGuardMetrics()
    const guard = new ReplayImportGuard({
      signer: createSigner(),
      metrics,
      defaultRequireEnvelope: {
        import: true,
      },
    })

    const decision = guard.evaluate({
      operation: 'import',
      actorId: 'operator-1',
      targetId: 'batch-1',
      source: 'external',
      payload: { importId: 'batch-1' },
      envelope: null,
    })

    assert.isFalse(decision.allowed)
    assert.equal(decision.reason, 'missing_envelope')
    assert.deepEqual(guard.metricsSnapshot(), {
      accepted: 0,
      rejected: 1,
      rejectedByReason: {
        missing_envelope: 1,
      },
      byOperation: {
        import: {
          accepted: 0,
          rejected: 1,
          rejectedByReason: {
            missing_envelope: 1,
          },
        },
      },
      bySource: {
        external: {
          accepted: 0,
          rejected: 1,
          rejectedByReason: {
            missing_envelope: 1,
          },
        },
      },
    })
  })

  test('rejects replay on invalid signature and records audit entry', ({ assert }) => {
    const signer = createSigner()
    const envelope = signer.sign(REPLAY_PAYLOAD)
    const invalidEnvelope = {
      ...envelope,
      signature: tamperEnvelopeSignature(envelope.signature),
    }
    const audits: ReplayImportGuardAuditEntry[] = []
    const guard = new ReplayImportGuard({
      signer,
      auditSink(entry) {
        audits.push(entry)
      },
    })

    const decision = guard.evaluate({
      operation: 'replay',
      actorId: 'player-1',
      targetId: 'game-1',
      source: 'persistence',
      payload: REPLAY_PAYLOAD,
      envelope: invalidEnvelope,
    })

    assert.isFalse(decision.allowed)
    assert.equal(decision.reason, 'invalid_signature')
    assert.lengthOf(audits, 1)
    assert.equal(audits[0].operation, 'replay')
    assert.equal(audits[0].actorId, 'player-1')
    assert.equal(audits[0].targetId, 'game-1')
    assert.equal(audits[0].source, 'persistence')
    assert.equal(audits[0].accepted, false)
    assert.equal(audits[0].reason, 'invalid_signature')
  })

  test('rejects replay when signed payload differs from expected payload', ({ assert }) => {
    const signer = createSigner()
    const guard = new ReplayImportGuard({ signer })
    const envelope = signer.sign(REPLAY_PAYLOAD)

    const decision = guard.evaluate({
      operation: 'replay',
      actorId: 'player-1',
      targetId: 'game-1',
      source: 'persistence',
      payload: {
        gameId: 'game-1',
        replayTimeline: [],
      },
      envelope,
    })

    assert.isFalse(decision.allowed)
    assert.equal(decision.reason, 'payload_mismatch')
  })
})
