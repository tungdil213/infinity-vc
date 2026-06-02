import type {
  ReplayPayloadDecodeIssue,
  GameReplayStep,
} from '@infinity.dev/game-runtime-session'
import { decodeReplayTimeline } from '@infinity.dev/game-runtime-session'
import type {
  StableSignatureAlgorithm,
  StableSignedEnvelope,
} from '@infinity.dev/boardgame-toolkit/serialization'

export interface DecodedReplayImportPayload {
  readonly replayTimeline: GameReplayStep[]
  readonly envelope: StableSignedEnvelope<Record<string, unknown>> | null
}

export type ReplayImportPayloadDecodeResult =
  | {
      readonly success: true
      readonly value: DecodedReplayImportPayload
      readonly issues: []
    }
  | {
      readonly success: false
      readonly value: null
      readonly issues: ReplayPayloadDecodeIssue[]
    }

export function decodeReplayImportPayload(input: {
  replayTimeline: unknown
  envelope?: unknown
}): ReplayImportPayloadDecodeResult {
  const timeline = decodeReplayTimeline(input.replayTimeline)
  const envelope = decodeReplayEnvelope(input.envelope)
  const issues = [...timeline.issues, ...envelope.issues]

  if (issues.length > 0 || !timeline.success || !envelope.success) {
    return {
      success: false,
      value: null,
      issues,
    }
  }

  return {
    success: true,
    value: {
      replayTimeline: timeline.value,
      envelope: envelope.value,
    },
    issues: [],
  }
}

function decodeReplayEnvelope(
  value: unknown
):
  | {
      readonly success: true
      readonly value: StableSignedEnvelope<Record<string, unknown>> | null
      readonly issues: []
    }
  | {
      readonly success: false
      readonly value: null
      readonly issues: ReplayPayloadDecodeIssue[]
    } {
  if (value === undefined || value === null) {
    return { success: true, value: null, issues: [] }
  }

  const issues: ReplayPayloadDecodeIssue[] = []
  const envelope = readRecord(value, 'envelope', issues)
  if (!envelope) {
    return { success: false, value: null, issues }
  }

  const schemaVersion = readPositiveInteger(envelope.schemaVersion, 'envelope.schemaVersion', issues)
  const keyId = readNonEmptyString(envelope.keyId, 'envelope.keyId', issues)
  const algorithm = readStableAlgorithm(envelope.algorithm, 'envelope.algorithm', issues)
  const signedAt = readNonEmptyString(envelope.signedAt, 'envelope.signedAt', issues)
  const payload = readRecord(envelope.payload, 'envelope.payload', issues)
  const signature = readNonEmptyString(envelope.signature, 'envelope.signature', issues)

  if (
    issues.length > 0 ||
    schemaVersion === null ||
    !keyId ||
    !algorithm ||
    !signedAt ||
    !payload ||
    !signature
  ) {
    return {
      success: false,
      value: null,
      issues,
    }
  }

  return {
    success: true,
    value: {
      schemaVersion,
      keyId,
      algorithm,
      signedAt,
      payload,
      signature,
    },
    issues: [],
  }
}

function readRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  issues.push({
    path,
    code: 'expected_object',
    message: 'Expected an object',
  })
  return null
}

function readPositiveInteger(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  issues.push({
    path,
    code: 'expected_positive_integer',
    message: 'Expected a positive integer',
  })
  return null
}

function readNonEmptyString(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  issues.push({
    path,
    code: 'expected_non_empty_string',
    message: 'Expected a non-empty string',
  })
  return null
}

function readStableAlgorithm(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): StableSignatureAlgorithm | null {
  if (value === 'sha256' || value === 'sha512') {
    return value
  }

  issues.push({
    path,
    code: 'unsupported_algorithm',
    message: 'Expected sha256 or sha512',
  })
  return null
}
