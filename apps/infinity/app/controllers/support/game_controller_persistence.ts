import Game, { type GameStateData } from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import type { GameReplayStep, GameSession } from '#application/services/game_engine_types'
import { decodeReplayStep, decodeReplayTimeline } from '@infinity.dev/game-runtime-session'

export interface PersistedGameSnapshot {
  gameType: string
  lobbyId: string
  settings: Record<string, unknown>
  engineState: Record<string, unknown>
  replayTimeline: GameReplayStep[]
}

export function buildPersistedGameFromSession(options: {
  session: GameSession
  runtimeStatus: 'HOT' | 'RESTORED'
  replayEnvelope?: unknown
  persistedAt?: Date
  statusOverride?: GameStatus
  abandonReason?: string
}): Game {
  const { session } = options
  const persistedAt = options.persistedAt ?? new Date()
  const gameState = session.state as unknown as Record<string, unknown>
  const statePlayers = Array.isArray(gameState.players)
    ? (gameState.players as Array<Record<string, unknown>>)
    : []

  const playerHands = statePlayers.reduce<Record<string, unknown[]>>((acc, player) => {
    const playerId = String(player.id ?? '')
    if (!playerId) {
      return acc
    }

    acc[playerId] = Array.isArray(player.hand) ? (player.hand as unknown[]) : []
    return acc
  }, {})

  const discardPile = Array.isArray(gameState.publicDiscards)
    ? (gameState.publicDiscards as unknown[])
    : Array.isArray(gameState.discardPile)
      ? (gameState.discardPile as unknown[])
      : []

  const deckCount = Array.isArray(gameState.deck)
    ? gameState.deck.length
    : Number(gameState.deckCount ?? 0)

  const eliminatedPlayers = statePlayers
    .filter((player) => player.isEliminated === true)
    .map((player) => String(player.id))

  const resolvedStatus =
    options.statusOverride ??
    (session.state.isFinished ? GameStatus.FINISHED : GameStatus.IN_PROGRESS)
  const replayTimeline = Array.isArray(session.timeline) ? session.timeline : []
  const persistedGameData: GameStateData = {
    currentRound: Number(gameState.round ?? 1),
    currentTurn: Number(gameState.turn ?? 0),
    deck: {
      remaining: Number.isNaN(deckCount) ? 0 : deckCount,
    },
    discardPile,
    playerHands,
    eliminatedPlayers,
    winner: typeof gameState.winnerId === 'string' ? gameState.winnerId : undefined,
    runtime: {
      gameType: session.gameType,
      lobbyId: session.lobbyId,
      settings: (gameState.settings as Record<string, unknown>) ?? {},
      engineState: gameState,
      replayTimeline,
      replayEnvelope: options.replayEnvelope ?? undefined,
      persistedAt: persistedAt.toISOString(),
      runtimeStatus: options.runtimeStatus,
      abandonReason: options.abandonReason,
    },
  }

  return Game.reconstitute(
    session.gameId,
    resolvedStatus,
    session.players.map((player) => ({
      uuid: player.id,
      nickName: player.name,
    })),
    persistedGameData,
    session.createdAt,
    [GameStatus.FINISHED, GameStatus.ABANDONED, GameStatus.ARCHIVED].includes(resolvedStatus)
      ? persistedAt
      : undefined
  )
}

export function extractPersistedGameSnapshot(game: Game): PersistedGameSnapshot | null {
  const gameData = asRecord(game.gameData)
  if (!gameData) {
    return null
  }

  const runtime = asRecord(gameData.runtime) ?? {}
  const runtimeEngineState = asRecord(runtime.engineState)
  const legacyEngineState = hasLegacyEngineStateShape(gameData) ? gameData : undefined

  const engineState = runtimeEngineState ?? legacyEngineState
  if (!engineState) {
    return null
  }

  const gameType =
    (typeof runtime.gameType === 'string' ? runtime.gameType : undefined) ||
    (typeof gameData.gameType === 'string' ? gameData.gameType : undefined)
  if (!gameType) {
    return null
  }

  const lobbyId =
    (typeof runtime.lobbyId === 'string' ? runtime.lobbyId : undefined) || `restored-${game.uuid}`

  return {
    gameType,
    lobbyId,
    settings: asRecord(runtime.settings) ?? {},
    engineState,
    replayTimeline: extractPersistedReplayTimeline(game),
  }
}

export function extractPersistedReplayTimeline(game: Game): GameReplayStep[] {
  const gameData = asRecord(game.gameData)
  if (!gameData) {
    return []
  }

  const runtime = asRecord(gameData.runtime)
  if (!runtime || !Array.isArray(runtime.replayTimeline)) {
    return []
  }

  const decoded = decodeReplayTimeline(runtime.replayTimeline, { allowEmpty: true })
  return decoded.success ? decoded.value : []
}

export function extractPersistedReplayEnvelope(game: Game): Record<string, unknown> | null {
  const gameData = asRecord(game.gameData)
  if (!gameData) {
    return null
  }

  const runtime = asRecord(gameData.runtime)
  if (!runtime) {
    return null
  }

  return asRecord(runtime.replayEnvelope)
}

export function normalizeReplayStep(rawStep: unknown, index: number): GameReplayStep | null {
  const decoded = decodeReplayStep(rawStep, index)
  return decoded.success ? decoded.value : null
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function hasLegacyEngineStateShape(value: Record<string, unknown>): boolean {
  return Array.isArray(value.players) && typeof value.phase === 'string'
}
