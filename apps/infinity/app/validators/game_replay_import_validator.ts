import vine from '@vinejs/vine'

const replayEventValidator = vine.object({
  type: vine.string().trim().minLength(1),
  payload: vine.any().optional(),
})

const replayPlayerValidator = vine.object({
  id: vine.string().trim().minLength(1),
  name: vine.string().trim().minLength(1),
  isActive: vine.boolean(),
  isEliminated: vine.boolean(),
  isProtected: vine.boolean(),
  handCount: vine.number().min(0),
  tokensOfAffection: vine.number().min(0),
})

const replayRoundValidator = vine.object({
  round: vine.number().min(0),
  winnerId: vine.string().trim().minLength(1).nullable(),
  choices: vine.record(vine.string().trim()).optional(),
})

const replaySnapshotValidator = vine.object({
  phase: vine.string().trim().minLength(1),
  round: vine.number().min(0),
  turn: vine.number().min(0),
  isFinished: vine.boolean(),
  winnerId: vine.string().trim().minLength(1).nullable(),
  currentPlayerId: vine.string().trim().minLength(1).nullable(),
  players: vine.array(replayPlayerValidator),
  scores: vine.record(vine.number()).optional(),
  roundChoices: vine.record(vine.string().trim()).optional(),
  rounds: vine.array(replayRoundValidator).optional(),
})

const replayStepValidator = vine.object({
  step: vine.number().min(0),
  kind: vine.enum(['initial', 'action'] as const),
  recordedAt: vine.string().trim().minLength(1),
  actorId: vine.string().trim().minLength(1).optional(),
  actionType: vine.string().trim().minLength(1).optional(),
  actionPayload: vine.record(vine.any()).optional(),
  events: vine.array(replayEventValidator),
  snapshot: replaySnapshotValidator,
})

const replayEnvelopeValidator = vine.object({
  schemaVersion: vine.number().positive(),
  keyId: vine.string().trim().minLength(1),
  algorithm: vine.enum(['sha256', 'sha512'] as const),
  signedAt: vine.string().trim().minLength(1),
  payload: vine.record(vine.any()),
  signature: vine.string().trim().minLength(1),
})

export const gameReplayImportBodyValidator = vine.compile(
  vine.object({
    replayTimeline: vine.array(replayStepValidator),
    envelope: replayEnvelopeValidator.optional(),
  })
)
