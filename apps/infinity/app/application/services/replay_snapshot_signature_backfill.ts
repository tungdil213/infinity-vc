import type { GameReplayStep } from '#application/services/game_engine_types'
import type { StableSignedEnvelope } from '@infinity.dev/boardgame-toolkit/serialization'

export interface ReplaySignatureBackfillPayload {
  readonly gameId: string
  readonly replayTimeline: GameReplayStep[]
}

export type ReplaySignatureBackfillSigner = (
  payload: ReplaySignatureBackfillPayload
) => StableSignedEnvelope<ReplaySignatureBackfillPayload> | null

export type ReplaySignatureBackfillSkipReason =
  | 'invalid_game_data'
  | 'missing_runtime'
  | 'missing_replay_timeline'
  | 'already_signed'
  | 'signing_unavailable'

export type ReplaySignatureBackfillUpdateReason = 'signed' | 'resigned'

export type ReplaySignatureBackfillPlan =
  | {
      readonly action: 'skip'
      readonly reason: ReplaySignatureBackfillSkipReason
    }
  | {
      readonly action: 'update'
      readonly reason: ReplaySignatureBackfillUpdateReason
      readonly replayStepCount: number
      readonly envelopeKeyId: string
      readonly nextGameData: Record<string, unknown>
    }

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function resolvePersistedAt(runtime: Record<string, unknown>, nowIso?: string): string {
  const existing = runtime.persistedAt
  if (typeof existing === 'string' && existing.trim().length > 0) {
    return existing
  }

  return nowIso ?? new Date().toISOString()
}

export function planReplaySignatureBackfill(input: {
  readonly gameId: string
  readonly gameData: unknown
  readonly signReplayPayload: ReplaySignatureBackfillSigner
  readonly forceResign?: boolean
  readonly nowIso?: string
}): ReplaySignatureBackfillPlan {
  const gameData = asRecord(input.gameData)
  if (!gameData) {
    return {
      action: 'skip',
      reason: 'invalid_game_data',
    }
  }

  const runtime = asRecord(gameData.runtime)
  if (!runtime) {
    return {
      action: 'skip',
      reason: 'missing_runtime',
    }
  }

  const replayTimelineValue = runtime.replayTimeline
  if (!Array.isArray(replayTimelineValue)) {
    return {
      action: 'skip',
      reason: 'missing_replay_timeline',
    }
  }

  const replayTimeline = replayTimelineValue as GameReplayStep[]
  const existingEnvelope = asRecord(runtime.replayEnvelope)
  if (existingEnvelope && !input.forceResign) {
    return {
      action: 'skip',
      reason: 'already_signed',
    }
  }

  const envelope = input.signReplayPayload({
    gameId: input.gameId,
    replayTimeline,
  })

  if (!envelope) {
    return {
      action: 'skip',
      reason: 'signing_unavailable',
    }
  }

  const persistedAt = resolvePersistedAt(runtime, input.nowIso)
  const nextGameData: Record<string, unknown> = {
    ...gameData,
    runtime: {
      ...runtime,
      replayEnvelope: envelope,
      persistedAt,
    },
  }

  return {
    action: 'update',
    reason: existingEnvelope ? 'resigned' : 'signed',
    replayStepCount: replayTimeline.length,
    envelopeKeyId: envelope.keyId,
    nextGameData,
  }
}
