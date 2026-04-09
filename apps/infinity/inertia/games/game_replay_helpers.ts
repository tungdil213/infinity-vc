import type { GamePlayerSummary, ReplaySnapshotPlayer, ReplayStep } from './game_renderer_types.js'

export interface ReplayDiffScoreChange {
  playerId: string
  previousScore: number
  currentScore: number
  delta: number
}

export interface ReplayDiff {
  hasPreviousStep: boolean
  previousPhase: string
  currentPhase: string
  phaseChanged: boolean
  previousCurrentPlayerId: string | null
  currentCurrentPlayerId: string | null
  currentPlayerChanged: boolean
  previousFinished: boolean
  currentFinished: boolean
  finishedChanged: boolean
  scoreChanges: ReplayDiffScoreChange[]
  scoreDeltaByPlayerId: Record<string, number>
}

export function computeReplayDiff(
  activeReplayStep: ReplayStep | null,
  previousReplayStep: ReplayStep | null
): ReplayDiff | null {
  if (!activeReplayStep) {
    return null
  }

  const currentSnapshot = activeReplayStep.snapshot
  const previousSnapshot = previousReplayStep?.snapshot
  if (!previousSnapshot) {
    return {
      hasPreviousStep: false,
      previousPhase: '',
      currentPhase: currentSnapshot.phase,
      phaseChanged: false,
      previousCurrentPlayerId: null,
      currentCurrentPlayerId: currentSnapshot.currentPlayerId,
      currentPlayerChanged: false,
      previousFinished: false,
      currentFinished: currentSnapshot.isFinished,
      finishedChanged: false,
      scoreChanges: [],
      scoreDeltaByPlayerId: {},
    }
  }

  const previousScores = previousSnapshot.scores ?? {}
  const currentScores = currentSnapshot.scores ?? {}
  const scorePlayerIds = Array.from(
    new Set([...Object.keys(previousScores), ...Object.keys(currentScores)])
  )
  const scoreChanges = scorePlayerIds
    .map((playerId) => {
      const previousScore = Number(previousScores[playerId] ?? 0)
      const currentScore = Number(currentScores[playerId] ?? 0)
      const delta = currentScore - previousScore

      return {
        playerId,
        previousScore,
        currentScore,
        delta,
      }
    })
    .filter((change) => change.delta !== 0)

  const scoreDeltaByPlayerId = scoreChanges.reduce<Record<string, number>>((acc, change) => {
    acc[change.playerId] = change.delta
    return acc
  }, {})

  return {
    hasPreviousStep: true,
    previousPhase: previousSnapshot.phase,
    currentPhase: currentSnapshot.phase,
    phaseChanged: previousSnapshot.phase !== currentSnapshot.phase,
    previousCurrentPlayerId: previousSnapshot.currentPlayerId,
    currentCurrentPlayerId: currentSnapshot.currentPlayerId,
    currentPlayerChanged: previousSnapshot.currentPlayerId !== currentSnapshot.currentPlayerId,
    previousFinished: previousSnapshot.isFinished,
    currentFinished: currentSnapshot.isFinished,
    finishedChanged: previousSnapshot.isFinished !== currentSnapshot.isFinished,
    scoreChanges,
    scoreDeltaByPlayerId,
  }
}

export function resolveGamePlayerLabel(args: {
  playerId?: string | null
  currentUserId: string
  replayPlayers?: ReplaySnapshotPlayer[]
  currentPlayers?: GamePlayerSummary[]
}): string {
  const { playerId, currentUserId, replayPlayers = [], currentPlayers = [] } = args

  if (!playerId) {
    return 'Unknown player'
  }

  if (playerId === currentUserId) {
    return 'You'
  }

  const replayPlayer = replayPlayers.find((player) => player.id === playerId)
  if (replayPlayer?.name) {
    return replayPlayer.name
  }

  const currentPlayer = currentPlayers.find((player) => player.id === playerId)
  if (currentPlayer?.name) {
    return currentPlayer.name
  }

  return playerId
}

export function describeGameReplayEvent(args: {
  event: { type: string; payload: unknown }
  getPlayerLabel: (playerId?: string | null) => string
}): string {
  const { event, getPlayerLabel } = args
  const payload = event.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return event.type
  }

  const record = payload as Record<string, unknown>
  const actorId =
    typeof record.playerId === 'string'
      ? record.playerId
      : typeof record.actorId === 'string'
        ? record.actorId
        : undefined
  const targetId =
    typeof record.targetPlayerId === 'string'
      ? record.targetPlayerId
      : typeof record.opponentId === 'string'
        ? record.opponentId
        : undefined

  const segments = [event.type]
  if (actorId) {
    segments.push(`by ${getPlayerLabel(actorId)}`)
  }
  if (targetId) {
    segments.push(`targeting ${getPlayerLabel(targetId)}`)
  }

  return segments.join(' ')
}

export function formatGameDebugPayload(payload: unknown): string {
  if (payload === undefined) {
    return 'No debug payload'
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return 'Unable to render payload'
  }
}
