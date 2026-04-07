import {
  stableJsonStringify,
  type StableEnvelopeVerificationReason,
  type StableEnvelopeVerificationResult,
  type StableSignedEnvelope,
  type StableEnvelopeSigner,
} from '@infinity.dev/boardgame-toolkit/serialization'

export type ReplayImportOperation = 'replay' | 'import'

export type ReplayImportGuardFailureReason =
  | StableEnvelopeVerificationReason
  | 'missing_envelope'
  | 'signer_unavailable'
  | 'payload_mismatch'

export type ReplayImportSource = 'memory' | 'restored' | 'persistence' | 'external'

export interface ReplayImportGuardRequest<TActorId extends string = string> {
  readonly operation: ReplayImportOperation
  readonly actorId: TActorId
  readonly targetId: string
  readonly source: ReplayImportSource
  readonly payload: Record<string, unknown>
  readonly envelope?: StableSignedEnvelope<Record<string, unknown>> | null
  readonly requireEnvelope?: boolean
}

export type ReplayImportGuardDecision =
  | {
      readonly allowed: true
      readonly verification: StableEnvelopeVerificationResult<Record<string, unknown>> | null
      readonly reason: null
    }
  | {
      readonly allowed: false
      readonly verification: StableEnvelopeVerificationResult<Record<string, unknown>> | null
      readonly reason: ReplayImportGuardFailureReason
    }

export interface ReplayImportGuardAuditEntry<TActorId extends string = string> {
  readonly operation: ReplayImportOperation
  readonly actorId: TActorId
  readonly targetId: string
  readonly source: ReplayImportSource
  readonly accepted: boolean
  readonly reason: ReplayImportGuardFailureReason | null
  readonly occurredAt: string
}

export type ReplayImportGuardAuditSink<TActorId extends string = string> = (
  entry: ReplayImportGuardAuditEntry<TActorId>
) => void

export interface ReplayImportGuardMetricsSnapshot {
  readonly accepted: number
  readonly rejected: number
  readonly rejectedByReason: Partial<Record<ReplayImportGuardFailureReason, number>>
  readonly byOperation: Partial<Record<ReplayImportOperation, ReplayImportGuardMetricsBucket>>
  readonly bySource: Partial<Record<ReplayImportSource, ReplayImportGuardMetricsBucket>>
}

export interface ReplayImportGuardMetricsBucket {
  readonly accepted: number
  readonly rejected: number
  readonly rejectedByReason: Partial<Record<ReplayImportGuardFailureReason, number>>
}

interface ReplayImportGuardMutableBucket {
  accepted: number
  rejected: number
  rejectedByReason: Map<ReplayImportGuardFailureReason, number>
}

export class ReplayImportGuardMetrics {
  private acceptedCount = 0
  private rejectedCount = 0
  private readonly rejectedByReason = new Map<ReplayImportGuardFailureReason, number>()
  private readonly byOperation = new Map<ReplayImportOperation, ReplayImportGuardMutableBucket>()
  private readonly bySource = new Map<ReplayImportSource, ReplayImportGuardMutableBucket>()

  recordAccepted(operation: ReplayImportOperation, source: ReplayImportSource) {
    this.acceptedCount += 1
    this.incrementAccepted(this.byOperation, operation)
    this.incrementAccepted(this.bySource, source)
  }

  recordRejected(
    reason: ReplayImportGuardFailureReason,
    operation: ReplayImportOperation,
    source: ReplayImportSource
  ) {
    this.rejectedCount += 1
    const current = this.rejectedByReason.get(reason) ?? 0
    this.rejectedByReason.set(reason, current + 1)
    this.incrementRejected(this.byOperation, operation, reason)
    this.incrementRejected(this.bySource, source, reason)
  }

  snapshot(): ReplayImportGuardMetricsSnapshot {
    return {
      accepted: this.acceptedCount,
      rejected: this.rejectedCount,
      rejectedByReason: Object.fromEntries(this.rejectedByReason.entries()),
      byOperation: this.snapshotBuckets(this.byOperation),
      bySource: this.snapshotBuckets(this.bySource),
    }
  }

  reset() {
    this.acceptedCount = 0
    this.rejectedCount = 0
    this.rejectedByReason.clear()
    this.byOperation.clear()
    this.bySource.clear()
  }

  private incrementAccepted<TKey extends string>(
    buckets: Map<TKey, ReplayImportGuardMutableBucket>,
    key: TKey
  ) {
    const bucket = this.getOrCreateBucket(buckets, key)
    bucket.accepted += 1
  }

  private incrementRejected<TKey extends string>(
    buckets: Map<TKey, ReplayImportGuardMutableBucket>,
    key: TKey,
    reason: ReplayImportGuardFailureReason
  ) {
    const bucket = this.getOrCreateBucket(buckets, key)
    bucket.rejected += 1
    const current = bucket.rejectedByReason.get(reason) ?? 0
    bucket.rejectedByReason.set(reason, current + 1)
  }

  private getOrCreateBucket<TKey extends string>(
    buckets: Map<TKey, ReplayImportGuardMutableBucket>,
    key: TKey
  ): ReplayImportGuardMutableBucket {
    const existing = buckets.get(key)
    if (existing) {
      return existing
    }

    const created: ReplayImportGuardMutableBucket = {
      accepted: 0,
      rejected: 0,
      rejectedByReason: new Map<ReplayImportGuardFailureReason, number>(),
    }
    buckets.set(key, created)
    return created
  }

  private snapshotBuckets<TKey extends string>(
    buckets: Map<TKey, ReplayImportGuardMutableBucket>
  ): Partial<Record<TKey, ReplayImportGuardMetricsBucket>> {
    return Object.fromEntries(
      [...buckets.entries()].map(([key, bucket]) => [
        key,
        {
          accepted: bucket.accepted,
          rejected: bucket.rejected,
          rejectedByReason: Object.fromEntries(bucket.rejectedByReason.entries()),
        } satisfies ReplayImportGuardMetricsBucket,
      ])
    ) as Partial<Record<TKey, ReplayImportGuardMetricsBucket>>
  }
}

export interface ReplayImportGuardOptions<TActorId extends string = string> {
  readonly signer?: StableEnvelopeSigner | null
  readonly metrics?: ReplayImportGuardMetrics
  readonly auditSink?: ReplayImportGuardAuditSink<TActorId>
  readonly defaultRequireEnvelope?: Partial<Record<ReplayImportOperation, boolean>>
}

export class ReplayImportGuard<TActorId extends string = string> {
  private readonly signer: StableEnvelopeSigner | null
  private readonly metrics: ReplayImportGuardMetrics
  private readonly auditSink: ReplayImportGuardAuditSink<TActorId> | null
  private readonly defaultRequireEnvelope: Partial<Record<ReplayImportOperation, boolean>>

  constructor(options?: ReplayImportGuardOptions<TActorId>) {
    this.signer = options?.signer ?? null
    this.metrics = options?.metrics ?? new ReplayImportGuardMetrics()
    this.auditSink = options?.auditSink ?? null
    this.defaultRequireEnvelope = options?.defaultRequireEnvelope ?? {}
  }

  signPayload(
    payload: Record<string, unknown>
  ): StableSignedEnvelope<Record<string, unknown>> | null {
    if (!this.signer) {
      return null
    }

    return this.signer.sign(payload)
  }

  evaluate(request: ReplayImportGuardRequest<TActorId>): ReplayImportGuardDecision {
    const requireEnvelope =
      request.requireEnvelope ?? this.defaultRequireEnvelope[request.operation] ?? false
    const envelope = request.envelope ?? null

    if (!envelope) {
      if (requireEnvelope) {
        return this.reject(request, 'missing_envelope', null)
      }

      return this.accept(request, null)
    }

    if (!this.signer) {
      return this.reject(request, 'signer_unavailable', null)
    }

    const verification = this.signer.verifyWithResult(envelope)
    if (!verification.valid) {
      return this.reject(request, verification.reason ?? 'invalid_envelope_schema', verification)
    }

    const expectedPayload = stableJsonStringify(request.payload)
    const verifiedPayload = stableJsonStringify(verification.envelope.payload)
    if (expectedPayload !== verifiedPayload) {
      return this.reject(request, 'payload_mismatch', verification)
    }

    return this.accept(request, verification)
  }

  metricsSnapshot(): ReplayImportGuardMetricsSnapshot {
    return this.metrics.snapshot()
  }

  resetMetrics() {
    this.metrics.reset()
  }

  private accept(
    request: ReplayImportGuardRequest<TActorId>,
    verification: StableEnvelopeVerificationResult<Record<string, unknown>> | null
  ): ReplayImportGuardDecision {
    this.metrics.recordAccepted(request.operation, request.source)
    this.audit({
      operation: request.operation,
      actorId: request.actorId,
      targetId: request.targetId,
      source: request.source,
      accepted: true,
      reason: null,
      occurredAt: new Date().toISOString(),
    })

    return {
      allowed: true,
      verification,
      reason: null,
    }
  }

  private reject(
    request: ReplayImportGuardRequest<TActorId>,
    reason: ReplayImportGuardFailureReason,
    verification: StableEnvelopeVerificationResult<Record<string, unknown>> | null
  ): ReplayImportGuardDecision {
    this.metrics.recordRejected(reason, request.operation, request.source)
    this.audit({
      operation: request.operation,
      actorId: request.actorId,
      targetId: request.targetId,
      source: request.source,
      accepted: false,
      reason,
      occurredAt: new Date().toISOString(),
    })

    return {
      allowed: false,
      verification,
      reason,
    }
  }

  private audit(entry: ReplayImportGuardAuditEntry<TActorId>) {
    if (!this.auditSink) {
      return
    }

    this.auditSink(entry)
  }
}
