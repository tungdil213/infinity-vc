import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import GameModel from '#models/game_model'
import { replayImportGuardService } from '#application/services/replay_import_guard_service'
import {
  planReplaySignatureBackfill,
  type ReplaySignatureBackfillSkipReason,
} from '#application/services/replay_snapshot_signature_backfill'

type BackfillSummary = {
  scanned: number
  updated: number
  updateCandidates: number
  skippedByReason: Record<ReplaySignatureBackfillSkipReason, number>
  reachedLimit: boolean
}

function emptySkippedByReason(): Record<ReplaySignatureBackfillSkipReason, number> {
  return {
    invalid_game_data: 0,
    missing_runtime: 0,
    missing_replay_timeline: 0,
    already_signed: 0,
    signing_unavailable: 0,
  }
}

function createSummary(): BackfillSummary {
  return {
    scanned: 0,
    updated: 0,
    updateCandidates: 0,
    skippedByReason: emptySkippedByReason(),
    reachedLimit: false,
  }
}

export default class BackfillReplaySignatures extends BaseCommand {
  static commandName = 'game:replay:backfill-signatures'
  static description = 'Backfill signed replay envelopes for persisted game snapshots'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Persist generated envelopes (default is dry-run)',
  })
  declare apply: boolean

  @flags.number({
    description: 'Maximum number of updates to persist when using --apply',
  })
  declare limit: number | undefined

  @flags.boolean({
    description: 'Re-sign snapshots that already contain an envelope',
  })
  declare forceResign: boolean

  async run() {
    const applyMode = this.apply === true
    const limit = this.normalizeLimit(this.limit)
    const summary = createSummary()

    this.logger.info(
      applyMode
        ? 'Running replay signature backfill in APPLY mode'
        : 'Running replay signature backfill in DRY-RUN mode'
    )

    const gameModels = await GameModel.query()
      .where('is_archived', false)
      .orderBy('started_at', 'asc')

    for (const gameModel of gameModels) {
      summary.scanned += 1

      const plan = planReplaySignatureBackfill({
        gameId: gameModel.uuid,
        gameData: gameModel.gameData,
        signReplayPayload: replayImportGuardService.signReplayPayload,
        forceResign: this.forceResign === true,
      })

      if (plan.action === 'skip') {
        summary.skippedByReason[plan.reason] += 1
        continue
      }

      summary.updateCandidates += 1
      if (!applyMode) {
        continue
      }

      if (limit !== undefined && summary.updated >= limit) {
        summary.reachedLimit = true
        continue
      }

      gameModel.gameData = plan.nextGameData
      await gameModel.save()
      summary.updated += 1
    }

    this.printSummary(summary, { applyMode, limit })
  }

  private normalizeLimit(limit: number | undefined): number | undefined {
    if (limit === undefined) {
      return undefined
    }

    if (!Number.isFinite(limit) || limit <= 0 || !Number.isInteger(limit)) {
      throw new Error('Flag --limit must be a positive integer')
    }

    return limit
  }

  private printSummary(
    summary: BackfillSummary,
    options: {
      applyMode: boolean
      limit: number | undefined
    }
  ) {
    this.logger.info(`Scanned games: ${summary.scanned}`)
    this.logger.info(`Candidates to sign: ${summary.updateCandidates}`)
    this.logger.info(`Updated games: ${summary.updated}`)

    this.logger.info('Skipped by reason:')
    this.logger.info(`- invalid_game_data: ${summary.skippedByReason.invalid_game_data}`)
    this.logger.info(`- missing_runtime: ${summary.skippedByReason.missing_runtime}`)
    this.logger.info(
      `- missing_replay_timeline: ${summary.skippedByReason.missing_replay_timeline}`
    )
    this.logger.info(`- already_signed: ${summary.skippedByReason.already_signed}`)
    this.logger.info(`- signing_unavailable: ${summary.skippedByReason.signing_unavailable}`)

    if (summary.reachedLimit) {
      this.logger.warning('Update limit reached before processing all candidates')
    }

    if (!options.applyMode) {
      this.logger.info('Dry-run complete: rerun with --apply to persist signatures')
      return
    }

    if (summary.skippedByReason.signing_unavailable > 0) {
      this.logger.warning(
        'Some snapshots could not be signed (signing key unavailable); strict mode is not ready'
      )
      return
    }

    if (summary.reachedLimit) {
      this.logger.warning(
        `Backfill partially applied due to --limit=${options.limit}; rerun to finish remaining candidates`
      )
      return
    }

    this.logger.success('Replay signature backfill apply run completed')
  }
}
