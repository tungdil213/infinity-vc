import Game, { type GameStateData } from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import type { GameReplayStep, GameSession } from '#application/services/game_engine_types'

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

  return runtime.replayTimeline
    .map((rawStep, index) => normalizeReplayStep(rawStep, index))
    .filter((step): step is GameReplayStep => step !== null)
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
  if (!rawStep || typeof rawStep !== 'object') {
    return null
  }

  const source = rawStep as Record<string, unknown>
  const rawEvents = Array.isArray(source.events) ? source.events : []
  const normalizedEvents = rawEvents.map((rawEvent) => {
    const event = rawEvent as Record<string, unknown>
    return {
      type: String(event.type ?? ''),
      payload: event.payload,
    }
  })

  const snapshot = source.snapshot as Record<string, unknown> | undefined
  const rawPlayers = Array.isArray(snapshot?.players) ? snapshot.players : []
  const players = rawPlayers.map((rawPlayer) => {
    const player = rawPlayer as Record<string, unknown>

    return {
      id: String(player.id ?? ''),
      name: String(player.name ?? 'Unknown'),
      isActive: Boolean(player.isActive),
      isEliminated: Boolean(player.isEliminated),
      isProtected: Boolean(player.isProtected),
      handCount: Number(player.handCount ?? 0) || 0,
      tokensOfAffection: Number(player.tokensOfAffection ?? 0) || 0,
    }
  })

  const rounds = Array.isArray(snapshot?.rounds)
    ? snapshot.rounds.map((rawRound, roundIndex) => {
        const round = rawRound as Record<string, unknown>
        const choicesSource = asRecord(round.choices) ?? {}
        const choices = Object.entries(choicesSource).reduce<Record<string, string>>(
          (acc, [playerId, move]) => {
            if (typeof move === 'string') {
              acc[playerId] = move
            }
            return acc
          },
          {}
        )

        return {
          round: Number(round.round ?? roundIndex + 1) || roundIndex + 1,
          winnerId: typeof round.winnerId === 'string' ? round.winnerId : null,
          choices,
        }
      })
    : undefined

  const scoresSource = asRecord(snapshot?.scores) ?? {}
  const scores = Object.entries(scoresSource).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const numericValue = Number(value)
      if (Number.isFinite(numericValue)) {
        acc[key] = numericValue
      }
      return acc
    },
    {}
  )

  const roundChoicesSource = asRecord(snapshot?.roundChoices) ?? {}
  const roundChoices = Object.entries(roundChoicesSource).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = value
      }
      return acc
    },
    {}
  )

  return {
    step: Number(source.step ?? index) || index,
    kind: source.kind === 'action' ? 'action' : 'initial',
    recordedAt:
      typeof source.recordedAt === 'string' ? source.recordedAt : new Date().toISOString(),
    actorId: typeof source.actorId === 'string' ? source.actorId : undefined,
    actionType: typeof source.actionType === 'string' ? source.actionType : undefined,
    actionPayload: asRecord(source.actionPayload) ?? undefined,
    events: normalizedEvents,
    snapshot: {
      phase: typeof snapshot?.phase === 'string' ? snapshot.phase : 'unknown',
      round: Number(snapshot?.round ?? 1) || 1,
      turn: Number(snapshot?.turn ?? 0) || 0,
      isFinished: Boolean(snapshot?.isFinished),
      winnerId: typeof snapshot?.winnerId === 'string' ? snapshot.winnerId : null,
      currentPlayerId:
        typeof snapshot?.currentPlayerId === 'string' ? snapshot.currentPlayerId : null,
      players,
      ...(Object.keys(scores).length > 0 ? { scores } : {}),
      ...(Object.keys(roundChoices).length > 0 ? { roundChoices } : {}),
      ...(rounds ? { rounds } : {}),
    },
  }
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
