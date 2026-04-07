import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import type { GameReplayStep } from '#application/services/game_engine_types'
import {
  StableEnvelopeSigner,
  type StableEnvelopeSignerKey,
  type StableSignedEnvelope,
} from '@infinity.dev/boardgame-toolkit/serialization'
import {
  ReplayImportGuard,
  type ReplayImportGuardDecision,
  type ReplayImportGuardFailureReason,
  type ReplayImportGuardMetricsSnapshot,
  type ReplayImportSource,
} from '#application/services/replay_import_guard'
import { replayVerificationAuditStore } from '#application/services/replay_verification_audit_store'

export interface ReplayEnvelopePayload {
  readonly gameId: string
  readonly replayTimeline: GameReplayStep[]
}

const REPLAY_DEFAULT_KEY_ID = 'replay-v1'

function parseRotatedKeys(raw: string | undefined): StableEnvelopeSignerKey[] {
  if (!raw || raw.trim().length === 0) {
    return []
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':')
      if (separatorIndex <= 0) {
        throw new Error(
          `Invalid REPLAY_SIGNING_PREVIOUS_KEYS entry "${entry}" (expected "keyId:secret")`
        )
      }

      const id = entry.slice(0, separatorIndex).trim()
      const secret = entry.slice(separatorIndex + 1).trim()
      if (!id || !secret) {
        throw new Error(
          `Invalid REPLAY_SIGNING_PREVIOUS_KEYS entry "${entry}" (empty keyId or secret)`
        )
      }

      return {
        id,
        secret,
        algorithm: 'sha256',
      } satisfies StableEnvelopeSignerKey
    })
}

function createDefaultSigner(): StableEnvelopeSigner | null {
  const activeKeyId = env.get('REPLAY_SIGNING_KEY_ID') ?? REPLAY_DEFAULT_KEY_ID
  const dedicatedKey = env.get('REPLAY_SIGNING_KEY')
  const fallbackAppKey = env.get('APP_KEY')
  const activeSecret =
    dedicatedKey && dedicatedKey.trim().length > 0 ? dedicatedKey : fallbackAppKey
  if (!activeSecret || !activeSecret.trim()) {
    logger.warn('Replay signing disabled because no signing secret was configured')
    return null
  }

  try {
    const keys = new Map<string, StableEnvelopeSignerKey>()
    keys.set(activeKeyId, {
      id: activeKeyId,
      secret: activeSecret,
      algorithm: 'sha256',
    })

    const previousKeys = parseRotatedKeys(env.get('REPLAY_SIGNING_PREVIOUS_KEYS'))
    for (const key of previousKeys) {
      if (!keys.has(key.id)) {
        keys.set(key.id, key)
      }
    }

    return new StableEnvelopeSigner([...keys.values()], { activeKeyId })
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to initialize replay signer'
    )
    return null
  }
}

const replayImportGuard = new ReplayImportGuard<string>({
  signer: createDefaultSigner(),
  defaultRequireEnvelope: {
    replay: env.get('REPLAY_REQUIRE_SIGNATURES') === true,
    import: true,
  },
})

async function persistRejectedDecision(
  decision: ReplayImportGuardDecision,
  context: {
    operation: 'replay' | 'import'
    source: ReplayImportSource
    actorId: string
    targetId: string
  }
): Promise<void> {
  if (decision.allowed) {
    return
  }

  const envelope = decision.verification?.envelope
  try {
    await replayVerificationAuditStore.append({
      operation: context.operation,
      source: context.source,
      actorId: context.actorId,
      targetId: context.targetId,
      accepted: false,
      reason: decision.reason as ReplayImportGuardFailureReason,
      envelope: envelope
        ? {
            keyId: envelope.keyId,
            algorithm: envelope.algorithm,
            signedAt: envelope.signedAt,
          }
        : null,
      metadata: {
        verifierReason: decision.reason,
      },
    })
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        source: context.source,
        actorId: context.actorId,
        targetId: context.targetId,
        reason: decision.reason,
      },
      'Failed to persist replay/import verification audit entry'
    )
  }

  logger.warn(
    {
      operation: context.operation,
      actorId: context.actorId,
      targetId: context.targetId,
      source: context.source,
      reason: decision.reason,
      envelopeKeyId: envelope?.keyId,
      envelopeAlgorithm: envelope?.algorithm,
    },
    'Replay/import verification rejected by guard'
  )
}

export const replayImportGuardService = {
  signReplayPayload(
    payload: ReplayEnvelopePayload
  ): StableSignedEnvelope<ReplayEnvelopePayload> | null {
    return replayImportGuard.signPayload(
      payload as unknown as Record<string, unknown>
    ) as StableSignedEnvelope<ReplayEnvelopePayload> | null
  },

  verifyReplay(options: {
    readonly gameId: string
    readonly actorId: string
    readonly source: ReplayImportSource
    readonly replayTimeline: GameReplayStep[]
    readonly envelope?: Record<string, unknown> | null
  }): Promise<ReplayImportGuardDecision> {
    const decision = replayImportGuard.evaluate({
      operation: 'replay',
      actorId: options.actorId,
      targetId: options.gameId,
      source: options.source,
      payload: {
        gameId: options.gameId,
        replayTimeline: options.replayTimeline,
      } as unknown as Record<string, unknown>,
      envelope: options.envelope as StableSignedEnvelope<Record<string, unknown>> | null,
    })
    return persistRejectedDecision(decision, {
      operation: 'replay',
      source: options.source,
      actorId: options.actorId,
      targetId: options.gameId,
    }).then(() => decision)
  },

  verifyImport(options: {
    readonly payload: Record<string, unknown>
    readonly actorId: string
    readonly targetId: string
    readonly source?: ReplayImportSource
    readonly envelope?: StableSignedEnvelope<Record<string, unknown>> | null
  }): Promise<ReplayImportGuardDecision> {
    const source = options.source ?? 'external'
    const decision = replayImportGuard.evaluate({
      operation: 'import',
      actorId: options.actorId,
      targetId: options.targetId,
      source,
      payload: options.payload,
      envelope: options.envelope ?? null,
      requireEnvelope: true,
    })
    return persistRejectedDecision(decision, {
      operation: 'import',
      source,
      actorId: options.actorId,
      targetId: options.targetId,
    }).then(() => decision)
  },

  exportMetrics(): ReplayImportGuardMetricsSnapshot {
    return replayImportGuard.metricsSnapshot()
  },

  resetMetrics() {
    replayImportGuard.resetMetrics()
  },
}
