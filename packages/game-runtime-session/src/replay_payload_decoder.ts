import type {
  GameReplaySnapshot,
  GameReplaySnapshotPlayer,
  GameReplayStep,
} from './game_engine_types.js'

export interface ReplayPayloadDecodeIssue {
  readonly path: string
  readonly code: string
  readonly message: string
}

export type ReplayPayloadDecodeResult<T> =
  | {
      readonly success: true
      readonly value: T
      readonly issues: []
    }
  | {
      readonly success: false
      readonly value: null
      readonly issues: ReplayPayloadDecodeIssue[]
    }

export interface ReplayTimelineDecodeOptions {
  readonly allowEmpty?: boolean
}

export function decodeReplayTimeline(
  value: unknown,
  options: ReplayTimelineDecodeOptions = {}
): ReplayPayloadDecodeResult<GameReplayStep[]> {
  const issues: ReplayPayloadDecodeIssue[] = []
  if (!Array.isArray(value)) {
    issues.push(issue('replayTimeline', 'expected_array', 'Replay timeline must be an array'))
    return failure(issues)
  }

  if (value.length === 0 && options.allowEmpty !== true) {
    issues.push(
      issue('replayTimeline', 'empty_timeline', 'Replay timeline must contain at least one step')
    )
    return failure(issues)
  }

  const steps = value.map((rawStep, index) => {
    const decoded = decodeReplayStep(rawStep, index)
    issues.push(...decoded.issues)
    return decoded.value
  })

  if (issues.length > 0) {
    return failure(issues)
  }

  return success(steps as GameReplayStep[])
}

export function decodeReplayStep(
  value: unknown,
  index: number
): ReplayPayloadDecodeResult<GameReplayStep> {
  const path = `replayTimeline[${index}]`
  const issues: ReplayPayloadDecodeIssue[] = []
  const source = readRecord(value, path, issues)
  if (!source) {
    return failure(issues)
  }

  const step = readNonNegativeInteger(source.step, `${path}.step`, issues)
  const kind = readReplayStepKind(source.kind, `${path}.kind`, issues)
  const recordedAt = readNonEmptyString(source.recordedAt, `${path}.recordedAt`, issues)
  const events = readReplayEvents(source.events, `${path}.events`, issues)
  const snapshot = decodeReplaySnapshot(source.snapshot, `${path}.snapshot`, issues)
  const actorId = readOptionalNonEmptyString(source.actorId, `${path}.actorId`, issues)
  const actionType = readOptionalNonEmptyString(source.actionType, `${path}.actionType`, issues)
  const actionPayload = readOptionalRecord(source.actionPayload, `${path}.actionPayload`, issues)

  if (kind === 'action' && !actionType) {
    issues.push(
      issue(`${path}.actionType`, 'required_for_action', 'Action replay steps require actionType')
    )
  }

  if (issues.length > 0 || step === null || !kind || !recordedAt || !snapshot) {
    return failure(issues)
  }

  return success({
    step,
    kind,
    recordedAt,
    ...(actorId ? { actorId } : {}),
    ...(actionType ? { actionType } : {}),
    ...(actionPayload ? { actionPayload } : {}),
    events,
    snapshot,
  })
}

function decodeReplaySnapshot(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): GameReplaySnapshot | null {
  const source = readRecord(value, path, issues)
  if (!source) {
    return null
  }

  const phase = readNonEmptyString(source.phase, `${path}.phase`, issues)
  const round = readNonNegativeInteger(source.round, `${path}.round`, issues)
  const turn = readNonNegativeInteger(source.turn, `${path}.turn`, issues)
  const isFinished = readBoolean(source.isFinished, `${path}.isFinished`, issues)
  const winnerId = readNullableString(source.winnerId, `${path}.winnerId`, issues)
  const currentPlayerId = readNullableString(
    source.currentPlayerId,
    `${path}.currentPlayerId`,
    issues
  )
  const players = readReplaySnapshotPlayers(source.players, `${path}.players`, issues)
  const scores = readOptionalNumberRecord(source.scores, `${path}.scores`, issues)
  const roundChoices = readOptionalStringRecord(source.roundChoices, `${path}.roundChoices`, issues)
  const rounds = readOptionalReplayRounds(source.rounds, `${path}.rounds`, issues)

  if (
    !phase ||
    round === null ||
    turn === null ||
    isFinished === null ||
    winnerId === undefined ||
    currentPlayerId === undefined
  ) {
    return null
  }

  return {
    phase,
    round,
    turn,
    isFinished,
    winnerId,
    currentPlayerId,
    players,
    ...(scores ? { scores } : {}),
    ...(roundChoices ? { roundChoices } : {}),
    ...(rounds ? { rounds } : {}),
  }
}

function readReplayEvents(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): GameReplayStep['events'] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, 'expected_array', 'Replay step events must be an array'))
    return []
  }

  return value.map((rawEvent, index) => {
    const eventPath = `${path}[${index}]`
    const event = readRecord(rawEvent, eventPath, issues)
    const type = event ? readNonEmptyString(event.type, `${eventPath}.type`, issues) : null

    return {
      type: type ?? '',
      payload: event?.payload,
    }
  })
}

function readReplaySnapshotPlayers(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): GameReplaySnapshotPlayer[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, 'expected_array', 'Replay snapshot players must be an array'))
    return []
  }

  return value.map((rawPlayer, index) => {
    const playerPath = `${path}[${index}]`
    const player = readRecord(rawPlayer, playerPath, issues)
    const id = player ? readNonEmptyString(player.id, `${playerPath}.id`, issues) : null
    const name = player ? readNonEmptyString(player.name, `${playerPath}.name`, issues) : null
    const isActive = player ? readBoolean(player.isActive, `${playerPath}.isActive`, issues) : null
    const isEliminated = player
      ? readBoolean(player.isEliminated, `${playerPath}.isEliminated`, issues)
      : null
    const isProtected = player
      ? readBoolean(player.isProtected, `${playerPath}.isProtected`, issues)
      : null
    const handCount = player
      ? readNonNegativeInteger(player.handCount, `${playerPath}.handCount`, issues)
      : null
    const tokensOfAffection = player
      ? readNonNegativeInteger(
          player.tokensOfAffection,
          `${playerPath}.tokensOfAffection`,
          issues
        )
      : null

    return {
      id: id ?? '',
      name: name ?? '',
      isActive: isActive ?? false,
      isEliminated: isEliminated ?? false,
      isProtected: isProtected ?? false,
      handCount: handCount ?? 0,
      tokensOfAffection: tokensOfAffection ?? 0,
    }
  })
}

function readOptionalReplayRounds(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): GameReplaySnapshot['rounds'] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push(issue(path, 'expected_array', 'Replay snapshot rounds must be an array'))
    return undefined
  }

  return value.map((rawRound, index) => {
    const roundPath = `${path}[${index}]`
    const round = readRecord(rawRound, roundPath, issues)
    const roundNumber = round
      ? readNonNegativeInteger(round.round, `${roundPath}.round`, issues)
      : null
    const winnerId = round
      ? readNullableString(round.winnerId, `${roundPath}.winnerId`, issues)
      : undefined
    const choices = round
      ? readStringRecord(round.choices, `${roundPath}.choices`, issues)
      : undefined

    return {
      round: roundNumber ?? index + 1,
      winnerId: winnerId ?? null,
      choices: choices ?? {},
    }
  })
}

function readReplayStepKind(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): GameReplayStep['kind'] | null {
  if (value === 'initial' || value === 'action') {
    return value
  }

  issues.push(issue(path, 'invalid_kind', 'Replay step kind must be "initial" or "action"'))
  return null
}

function readRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  issues.push(issue(path, 'expected_object', 'Expected an object'))
  return null
}

function readOptionalRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined
  }

  return readRecord(value, path, issues) ?? undefined
}

function readNonEmptyString(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  issues.push(issue(path, 'expected_non_empty_string', 'Expected a non-empty string'))
  return null
}

function readOptionalNonEmptyString(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  return readNonEmptyString(value, path, issues) ?? undefined
}

function readNullableString(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): string | null | undefined {
  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  issues.push(issue(path, 'expected_nullable_string', 'Expected a string or null'))
  return undefined
}

function readBoolean(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  issues.push(issue(path, 'expected_boolean', 'Expected a boolean'))
  return null
}

function readNonNegativeInteger(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }

  issues.push(issue(path, 'expected_non_negative_integer', 'Expected a non-negative integer'))
  return null
}

function readOptionalNumberRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, number> | undefined {
  if (value === undefined) {
    return undefined
  }

  return readNumberRecord(value, path, issues)
}

function readNumberRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, number> | undefined {
  const source = readRecord(value, path, issues)
  if (!source) {
    return undefined
  }

  return Object.entries(source).reduce<Record<string, number>>((acc, [key, entry]) => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      acc[key] = entry
      return acc
    }

    issues.push(
      issue(`${path}.${key}`, 'expected_finite_number', 'Expected a finite numeric score')
    )
    return acc
  }, {})
}

function readOptionalStringRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined
  }

  return readStringRecord(value, path, issues)
}

function readStringRecord(
  value: unknown,
  path: string,
  issues: ReplayPayloadDecodeIssue[]
): Record<string, string> | undefined {
  const source = readRecord(value, path, issues)
  if (!source) {
    return undefined
  }

  return Object.entries(source).reduce<Record<string, string>>((acc, [key, entry]) => {
    if (typeof entry === 'string') {
      acc[key] = entry
      return acc
    }

    issues.push(issue(`${path}.${key}`, 'expected_string', 'Expected a string value'))
    return acc
  }, {})
}

function issue(path: string, code: string, message: string): ReplayPayloadDecodeIssue {
  return { path, code, message }
}

function success<T>(value: T): ReplayPayloadDecodeResult<T> {
  return {
    success: true,
    value,
    issues: [],
  }
}

function failure<T>(issues: ReplayPayloadDecodeIssue[]): ReplayPayloadDecodeResult<T> {
  return {
    success: false,
    value: null,
    issues,
  }
}
