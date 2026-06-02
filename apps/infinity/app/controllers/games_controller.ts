import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import {
  projectActiveGames,
  projectGameHistoryItem,
  projectGameStats,
  type GameProjectionInput,
} from '@infinity.dev/game-runtime-session'
import { gameEngineService } from '#application/services/game_engine_service'
import { replayImportGuardService } from '#application/services/replay_import_guard_service'
import { getGameSession, type RawGameActionInput } from '#controllers/support/game_controller_guard'
import {
  buildPersistedGameFromSession,
  extractPersistedGameSnapshot,
  extractPersistedReplayEnvelope,
  extractPersistedReplayTimeline,
} from '#controllers/support/game_controller_persistence'
import { importReplayForGame } from '#controllers/support/game_controller_replay_admin'
import {
  executeGameActionFlow,
  resolveGameActionsPayload,
  resolveGameApiPayload,
  resolvePublicPlayersPayload,
} from '#controllers/support/game_controller_runtime_api'
import {
  canViewDebugPayload,
  resolveGameRuntimeView,
  sanitizeReplayTimelineForViewer,
} from '#controllers/support/game_controller_runtime'
import Game from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import { toGamePagePayload } from '#presenters/game_presenter'
import { gameActionBodyValidator, gameUuidParamValidator } from '#validators/game_action_validator'
import { gameHistoryQueryValidator } from '#validators/game_history_validator'
import { gameReplayImportBodyValidator } from '#validators/game_replay_import_validator'
import type { GameReplayStep, GameSession } from '#application/services/game_engine_types'

const GAME_ACTION_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  'Game not found': 'games.errors.notFound',
  'action is required': 'games.errors.actionRequired',
  'cardType is required': 'games.errors.cardTypeRequired',
  'move is required': 'games.errors.moveRequired',
}

const RESUMABLE_STATUSES = new Set<GameStatus>([GameStatus.IN_PROGRESS, GameStatus.PAUSED])

@inject()
export default class GamesController {
  private readonly restoredSessionIds = new Set<string>()

  constructor(private gameRepository: DatabaseGameRepository) {}

  /**
   * Display specific game (Inertia page)
   */
  async show({ params, inertia, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const runtimeView = await resolveGameRuntimeView({
      gameUuid: uuid,
      user,
      resolveRuntimeSession: (gameUuid) => this.resolveRuntimeSession(gameUuid),
      runtimeReader: gameEngineService,
    })
    if (!runtimeView) {
      return inertia.render('errors/not_found', {
        error: { message: i18n.t('games.errors.notFound') },
      })
    }

    return inertia.render(
      'game',
      toGamePagePayload({
        session: runtimeView.session,
        playerView: runtimeView.playerView,
        availableActions: runtimeView.availableActions,
        user: {
          uuid: user.userUuid,
          nickName: user.fullName ?? user.email,
          role: user.normalizedRole,
        },
        isSpectator: runtimeView.isSpectator,
        replayTimeline: runtimeView.replayTimeline,
        gameDisplayName: runtimeView.gameDisplayName,
        gamePresentation: runtimeView.gamePresentation,
        runtimeStatus: runtimeView.runtimeStatus,
      }) as any
    )
  }

  /**
   * Resume an active game for the current player.
   */
  async resume({ params, auth, response, session, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)
    const game = await this.gameRepository.findByUuid(uuid)

    if (!game) {
      session.flash('error', i18n.t('games.errors.notFoundOrFinished'))
      return response.redirect('/lobbies')
    }

    if (!game.hasPlayer(user.userUuid)) {
      session.flash('error', i18n.t('games.errors.resumeUnauthorized'))
      return response.redirect('/lobbies')
    }

    if (!RESUMABLE_STATUSES.has(game.status)) {
      session.flash('error', i18n.t('games.errors.resumeUnavailable'))
      return response.redirect('/profile')
    }

    return response.redirect(`/games/${uuid}`)
  }

  /**
   * Get game state (API endpoint)
   */
  async apiShow({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const result = await resolveGameApiPayload({
      gameUuid: uuid,
      user,
      resolveRuntimeSession: (gameUuid) => this.resolveRuntimeSession(gameUuid),
      runtimeReader: gameEngineService,
    })
    if (result.status === 'not_found') {
      return response.status(404).json({ error: i18n.t('games.errors.notFoundOrFinished') })
    }

    return response.json(result.payload)
  }

  /**
   * Get available actions for current player
   */
  async getActions({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const result = await resolveGameActionsPayload({
      gameUuid: uuid,
      userUuid: user.userUuid,
      resolveRuntimeSession: (gameUuid) => this.resolveRuntimeSession(gameUuid),
      getAvailableActions: (gameUuid, userUuid) =>
        gameEngineService.getAvailableActions(gameUuid, userUuid),
    })
    if (result.status === 'not_found') {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    return response.json(result.payload)
  }

  /**
   * Execute a game action (draw card, play card)
   */
  async action({ params, request, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)
    const body = (await request.validateUsing(gameActionBodyValidator)) as RawGameActionInput

    const result = await executeGameActionFlow({
      gameUuid: uuid,
      user,
      rawActionInput: body,
      resolveRuntimeSession: (gameUuid) => this.resolveRuntimeSession(gameUuid),
      runtimeReader: gameEngineService,
      persistSessionSnapshot: (session) => this.persistSessionSnapshot(session),
      onPersistError: (error) => {
        logger.error({ error, gameUuid: uuid }, 'Failed to persist game snapshot after action')
      },
    })
    if (result.status === 'not_found') {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    if (result.status === 'spectator') {
      return response.status(403).json({ error: i18n.t('games.errors.spectatorsCannotAct') })
    }

    if (result.status === 'invalid_action') {
      return response.status(400).json({
        error: this.translateGameActionError(i18n, result.error, 'games.errors.invalidAction'),
      })
    }

    if (result.status === 'rejected') {
      return response.status(400).json({
        error: this.translateGameActionError(i18n, result.error, 'games.errors.actionRejected'),
      })
    }

    return response.json(result.payload)
  }

  /**
   * Get all players' public state (for spectators or between turns)
   */
  async getPlayers({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const result = await resolvePublicPlayersPayload({
      gameUuid: uuid,
      userUuid: user.userUuid,
      resolveRuntimeSession: (gameUuid) => this.resolveRuntimeSession(gameUuid),
    })
    if (result.status === 'not_found') {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    return response.json(result.payload)
  }

  /**
   * Get replay timeline for live or persisted games.
   */
  async replay({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user
    const { uuid } = await gameUuidParamValidator.validate(params)
    const actorId = user?.userUuid ?? 'anonymous'
    const includeDebugPayload = canViewDebugPayload(user?.normalizedRole)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (resolvedSession) {
      const replayTimeline = gameEngineService.getReplayTimeline(uuid)
      const persistedGameForGuard =
        resolvedSession.source === 'restored' ? await this.gameRepository.findByUuid(uuid) : null
      const guardDecision = await this.verifyReplayTimelineIntegrity({
        gameUuid: uuid,
        actorId,
        source: resolvedSession.source,
        replayTimeline,
        persistedGame: persistedGameForGuard,
      })
      if (!guardDecision.allowed) {
        return response.status(422).json({
          error: i18n.t('games.errors.replayVerificationFailed'),
          reason: guardDecision.reason,
        })
      }

      return response.json({
        gameId: uuid,
        source: resolvedSession.source,
        replayTimeline: sanitizeReplayTimelineForViewer(replayTimeline, includeDebugPayload),
      })
    }

    const persistedGame = await this.gameRepository.findByUuid(uuid)
    if (!persistedGame) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    const replayTimeline = extractPersistedReplayTimeline(persistedGame)
    const guardDecision = await this.verifyReplayTimelineIntegrity({
      gameUuid: uuid,
      actorId,
      source: 'persistence',
      replayTimeline,
      persistedGame,
    })
    if (!guardDecision.allowed) {
      return response.status(422).json({
        error: i18n.t('games.errors.replayVerificationFailed'),
        reason: guardDecision.reason,
      })
    }

    return response.json({
      gameId: uuid,
      source: 'persistence',
      replayTimeline: sanitizeReplayTimelineForViewer(replayTimeline, includeDebugPayload),
    })
  }

  /**
   * Leave/forfeit game
   */
  async leave({ params, response }: HttpContext) {
    const { uuid } = await gameUuidParamValidator.validate(params)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return response.redirect('/lobbies')
    }
    const { session } = resolvedSession

    await this.persistSessionSnapshot(session, {
      statusOverride: session.state.isFinished ? GameStatus.FINISHED : GameStatus.ABANDONED,
      abandonReason: session.state.isFinished ? undefined : 'player_left',
    }).catch((error) => {
      logger.error({ error, gameUuid: uuid }, 'Failed to persist game snapshot on leave')
    })

    gameEngineService.endGame(uuid)
    this.restoredSessionIds.delete(uuid)

    return response.redirect('/lobbies')
  }

  /**
   * Get current user's active games.
   */
  async myActive({ auth, response }: HttpContext) {
    const user = auth.user!
    const games = await this.gameRepository.findActiveByPlayer(user.userUuid)
    const activeGames = projectActiveGames(games.map((game) => this.toGameProjectionInput(game)))

    return response.json({
      userUuid: user.userUuid,
      activeGames,
      total: activeGames.length,
    })
  }

  /**
   * Get current user's game history
   */
  async myHistory({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { limit: rawLimit, status: rawStatus } =
      await request.validateUsing(gameHistoryQueryValidator)
    const limit = rawLimit ? Math.min(Math.max(Number.parseInt(rawLimit, 10), 1), 100) : 20
    const statusFilter = this.normalizeStatusFilter(rawStatus)

    const allGames = await this.gameRepository.findByPlayer(user.userUuid)
    const projectedGames = allGames.map((game) => this.toGameProjectionInput(game))
    const filteredGames = statusFilter
      ? projectedGames.filter((game) => game.status === statusFilter)
      : projectedGames

    const history = filteredGames
      .slice(0, limit)
      .map((game) => projectGameHistoryItem(game, user.userUuid))

    return response.json({
      history,
      total: filteredGames.length,
      limit,
      filters: {
        status: statusFilter ?? null,
      },
    })
  }

  /**
   * Get current user's aggregated game stats
   */
  async myStats({ auth, response }: HttpContext) {
    const user = auth.user!
    const games = await this.gameRepository.findByPlayer(user.userUuid)
    const projectedGames = games.map((game) => this.toGameProjectionInput(game))
    const stats = projectGameStats(projectedGames, user.userUuid)

    return response.json({
      userUuid: user.userUuid,
      ...stats,
    })
  }

  async verificationMetrics({ response }: HttpContext) {
    return response.json(replayImportGuardService.exportMetrics())
  }

  async resetVerificationMetrics({ response }: HttpContext) {
    replayImportGuardService.resetMetrics()
    return response.json({
      ok: true,
      metrics: replayImportGuardService.exportMetrics(),
    })
  }

  async importReplay({ params, request, response, auth, i18n }: HttpContext) {
    const actorId = auth.user?.userUuid ?? 'anonymous'
    const { uuid } = await gameUuidParamValidator.validate(params)
    const body = (await request.validateUsing(gameReplayImportBodyValidator)) as {
      replayTimeline: unknown[]
      envelope?: Record<string, unknown>
    }

    const importResult = await importReplayForGame({
      gameUuid: uuid,
      actorId,
      replayTimeline: body.replayTimeline,
      envelope: body.envelope ?? null,
      gameRepository: this.gameRepository,
    })

    if (importResult.status === 'not_found') {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    if (importResult.status === 'invalid_payload') {
      return response.status(422).json({
        error: i18n.t('games.errors.replayImportPayloadInvalid'),
        issues: importResult.issues,
      })
    }

    if (importResult.status === 'verification_failed') {
      return response.status(422).json({
        error: i18n.t('games.errors.importVerificationFailed'),
        reason: importResult.reason,
      })
    }

    return response.json({
      gameId: importResult.gameId,
      importedSteps: importResult.importedSteps,
    })
  }

  private async resolveRuntimeSession(
    gameUuid: string
  ): Promise<{ session: GameSession; source: 'memory' | 'restored' } | null> {
    const inMemorySession = getGameSession(gameUuid, (requestedGameUuid) =>
      gameEngineService.getSession(requestedGameUuid)
    )
    if (inMemorySession) {
      const source = this.restoredSessionIds.has(gameUuid) ? 'restored' : 'memory'
      return { session: inMemorySession, source }
    }

    const restoredSession = await this.restoreSessionFromPersistence(gameUuid)
    if (!restoredSession) {
      return null
    }

    this.restoredSessionIds.add(gameUuid)
    return { session: restoredSession, source: 'restored' }
  }

  private async restoreSessionFromPersistence(gameUuid: string): Promise<GameSession | null> {
    const persistedGame = await this.gameRepository.findByUuid(gameUuid)
    if (!persistedGame) {
      return null
    }

    if (![GameStatus.IN_PROGRESS, GameStatus.PAUSED].includes(persistedGame.status)) {
      return null
    }

    const snapshot = extractPersistedGameSnapshot(persistedGame)
    if (!snapshot) {
      logger.warn(
        { gameUuid },
        'Persisted game exists but no runtime snapshot is available for restoration'
      )
      return null
    }

    const restoreResult = await gameEngineService.restoreGameSession({
      gameId: persistedGame.uuid,
      lobbyId: snapshot.lobbyId,
      gameType: snapshot.gameType,
      players: persistedGame.players,
      engineState: snapshot.engineState,
      gameSettings: snapshot.settings,
      replayTimeline: snapshot.replayTimeline,
      startedAt: persistedGame.startedAt,
    })

    if (restoreResult.isFailure) {
      logger.error(
        { gameUuid, error: restoreResult.error },
        'Failed to restore game session from persisted snapshot'
      )
      return null
    }

    return restoreResult.value
  }

  private async persistSessionSnapshot(
    session: GameSession,
    options?: {
      statusOverride?: GameStatus
      abandonReason?: string
    }
  ): Promise<void> {
    const runtimeStatus: 'HOT' | 'RESTORED' = this.restoredSessionIds.has(session.gameId)
      ? 'RESTORED'
      : 'HOT'
    const replayTimeline = Array.isArray(session.timeline) ? session.timeline : []
    const replayEnvelope = replayImportGuardService.signReplayPayload({
      gameId: session.gameId,
      replayTimeline,
    })
    const persistedGame = buildPersistedGameFromSession({
      session,
      runtimeStatus,
      replayEnvelope,
      persistedAt: new Date(),
      statusOverride: options?.statusOverride,
      abandonReason: options?.abandonReason,
    })

    await this.gameRepository.save(persistedGame)

    if (session.state.isFinished) {
      this.restoredSessionIds.delete(session.gameId)
    }
  }

  private toGameProjectionInput(game: Game): GameProjectionInput {
    return {
      uuid: game.uuid,
      status: game.status,
      players: game.players,
      gameData: game.gameData,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt ?? null,
      durationMs: game.duration,
    }
  }

  private normalizeStatusFilter(rawStatus: unknown): GameStatus | null {
    if (typeof rawStatus !== 'string' || rawStatus.trim().length === 0) {
      return null
    }

    const normalized = rawStatus.trim().toUpperCase()
    const allowedStatuses = new Set<string>(Object.values(GameStatus))
    if (!allowedStatuses.has(normalized)) {
      return null
    }

    return normalized as GameStatus
  }

  private async verifyReplayTimelineIntegrity(options: {
    gameUuid: string
    actorId: string
    source: 'memory' | 'restored' | 'persistence'
    replayTimeline: GameReplayStep[]
    persistedGame?: Game | null
  }) {
    const replayEnvelope =
      options.persistedGame && options.source !== 'memory'
        ? extractPersistedReplayEnvelope(options.persistedGame)
        : null

    return replayImportGuardService.verifyReplay({
      gameId: options.gameUuid,
      actorId: options.actorId,
      source: options.source,
      replayTimeline: options.replayTimeline,
      envelope: replayEnvelope,
    })
  }

  private translateGameActionError(
    i18n: HttpContext['i18n'],
    rawError: string | undefined,
    fallbackKey: string
  ): string {
    if (!rawError) {
      return i18n.t(fallbackKey)
    }

    const normalizedError = rawError.trim()
    const translatedKey = GAME_ACTION_ERROR_TRANSLATION_KEYS[normalizedError]
    if (translatedKey) {
      return i18n.t(translatedKey)
    }

    return i18n.t(fallbackKey)
  }
}
