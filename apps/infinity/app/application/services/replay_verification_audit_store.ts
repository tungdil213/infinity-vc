import ReplayVerificationAuditModel from '#models/replay_verification_audit'
import type {
  ReplayImportOperation,
  ReplayImportSource,
  ReplayImportGuardFailureReason,
} from '#application/services/replay_import_guard'

export interface ReplayVerificationAuditWrite {
  readonly operation: ReplayImportOperation
  readonly source: ReplayImportSource
  readonly actorId: string
  readonly targetId: string
  readonly accepted: boolean
  readonly reason: ReplayImportGuardFailureReason | null
  readonly envelope?: {
    readonly keyId?: string
    readonly algorithm?: string
    readonly signedAt?: string
  } | null
  readonly metadata?: Record<string, unknown>
}

class ReplayVerificationAuditStore {
  async append(entry: ReplayVerificationAuditWrite): Promise<void> {
    await ReplayVerificationAuditModel.create({
      operation: entry.operation,
      source: entry.source,
      actorId: entry.actorId,
      targetId: entry.targetId,
      accepted: entry.accepted,
      reason: entry.reason,
      envelopeKeyId: entry.envelope?.keyId ?? null,
      envelopeAlgorithm: entry.envelope?.algorithm ?? null,
      envelopeSignedAt: entry.envelope?.signedAt ?? null,
      metadata: entry.metadata ?? null,
    })
  }
}

export const replayVerificationAuditStore = new ReplayVerificationAuditStore()
