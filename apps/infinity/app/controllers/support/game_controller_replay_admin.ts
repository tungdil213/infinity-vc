import type { StableSignedEnvelope } from '@infinity.dev/boardgame-toolkit/serialization'
import type {
  ReplayImportGuardDecision,
  ReplayImportGuardFailureReason,
} from '#application/services/replay_import_guard'
import { replayImportGuardService } from '#application/services/replay_import_guard_service'
import {
  decodeReplayImportPayload,
} from '#application/services/replay_import_payload_decoder'
import type { GameReplayStep } from '#application/services/game_engine_types'
import type { ReplayPayloadDecodeIssue } from '@infinity.dev/game-runtime-session'
import Game, { type GameStateData } from '#domain/entities/game'
import { asRecord } from './game_controller_persistence.js'

export interface ReplayImportGameRepository {
  findByUuid(gameUuid: string): Promise<Game | null>
  save(game: Game): Promise<unknown>
}

export interface ReplayImportGuardVerifier {
  verifyImport(options: {
    readonly payload: Record<string, unknown>
    readonly actorId: string
    readonly targetId: string
    readonly source?: 'memory' | 'restored' | 'persistence' | 'external'
    readonly envelope?: StableSignedEnvelope<Record<string, unknown>> | null
  }): Promise<ReplayImportGuardDecision>
}

export type ReplayImportResult =
  | {
      readonly status: 'not_found'
    }
  | {
      readonly status: 'invalid_payload'
      readonly issues: ReplayPayloadDecodeIssue[]
    }
  | {
      readonly status: 'verification_failed'
      readonly reason: ReplayImportGuardFailureReason
    }
  | {
      readonly status: 'imported'
      readonly gameId: string
      readonly importedSteps: number
    }

export async function importReplayForGame(options: {
  readonly gameUuid: string
  readonly actorId: string
  readonly replayTimeline: unknown[]
  readonly envelope?: Record<string, unknown> | null
  readonly gameRepository: ReplayImportGameRepository
  readonly guardVerifier?: ReplayImportGuardVerifier
  readonly now?: () => Date
}): Promise<ReplayImportResult> {
  const persistedGame = await options.gameRepository.findByUuid(options.gameUuid)
  if (!persistedGame) {
    return { status: 'not_found' }
  }

  const decodedPayload = decodeReplayImportPayload({
    replayTimeline: options.replayTimeline,
    envelope: options.envelope,
  })
  if (!decodedPayload.success) {
    return {
      status: 'invalid_payload',
      issues: decodedPayload.issues,
    }
  }

  const guardVerifier = options.guardVerifier ?? replayImportGuardService
  const guardDecision = await guardVerifier.verifyImport({
    payload: {
      gameId: options.gameUuid,
      replayTimeline: decodedPayload.value.replayTimeline,
    },
    actorId: options.actorId,
    targetId: options.gameUuid,
    source: 'external',
    envelope: decodedPayload.value.envelope,
  })
  if (!guardDecision.allowed) {
    return {
      status: 'verification_failed',
      reason: guardDecision.reason,
    }
  }

  const currentGameData = asRecord(persistedGame.gameData) ?? {}
  const currentRuntime = asRecord(currentGameData.runtime) ?? {}
  const nextGameData = {
    ...currentGameData,
    runtime: {
      ...currentRuntime,
      replayTimeline: decodedPayload.value.replayTimeline,
      replayEnvelope: decodedPayload.value.envelope ?? currentRuntime.replayEnvelope ?? null,
      importedAt: (options.now ?? (() => new Date()))().toISOString(),
      importedBy: options.actorId,
    },
  }

  await options.gameRepository.save(
    Game.reconstitute(
      persistedGame.uuid,
      persistedGame.status,
      persistedGame.players,
      nextGameData as GameStateData,
      persistedGame.startedAt,
      persistedGame.finishedAt
    )
  )

  return {
    status: 'imported',
    gameId: options.gameUuid,
    importedSteps: decodedPayload.value.replayTimeline.length,
  }
}

export function normalizeReplayTimeline(rawTimeline: unknown[]): GameReplayStep[] | null {
  const decoded = decodeReplayImportPayload({ replayTimeline: rawTimeline })
  return decoded.success ? decoded.value.replayTimeline : null
}
