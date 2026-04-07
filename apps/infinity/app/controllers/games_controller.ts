import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { gameEngineService } from '#application/services/game_engine_service'
import type { GameReplayStep, GameSession } from '#application/services/game_engine_types'
import { replayImportGuardService } from '#application/services/replay_import_guard_service'
import {
  executeParsedGameAction,
  getGameSession,
  isUserInGameSession,
  parseGameActionInput,
  type RawGameActionInput,
} from '#controllers/support/game_controller_guard'
import Game, { type GameStateData } from '#domain/entities/game'
import { GameStatus } from '#domain/value_objects/game_status'
import { DatabaseGameRepository } from '#infrastructure/repositories/database_game_repository'
import {
  toActionResponsePayload,
  toGameActionsPayload,
  toGameApiPayload,
  toGamePagePayload,
  toPublicPlayersPayload,
  toSpectatorPlayerView,
} from '#presenters/game_presenter'
import { gameActionBodyValidator, gameUuidParamValidator } from '#validators/game_action_validator'
import { gameHistoryQueryValidator } from '#validators/game_history_validator'
import { gameReplayImportBodyValidator } from '#validators/game_replay_import_validator'
import {
  projectActiveGames,
  projectGameHistoryItem,
  projectGameStats,
  type GameProjectionInput,
} from '@infinity.dev/game-runtime-session'
import type { StableSignedEnvelope } from '@infinity.dev/boardgame-toolkit/serialization'

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
    const canViewDebugPayload = this.canViewDebugPayload(user.normalizedRole)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return inertia.render('errors/not_found', {
        error: { message: i18n.t('games.errors.notFound') },
      })
    }
    const { session, source } = resolvedSession

    const isSpectator = !isUserInGameSession(session, user.userUuid)
    const playerView = isSpectator
      ? toSpectatorPlayerView({ session, currentUserUuid: user.userUuid })
      : gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = isSpectator
      ? []
      : gameEngineService.getAvailableActions(uuid, user.userUuid)

    return inertia.render(
      'game',
      toGamePagePayload({
        session,
        playerView,
        availableActions,
        user: {
          uuid: user.userUuid,
          nickName: user.fullName ?? user.email,
          role: user.normalizedRole,
        },
        isSpectator,
        replayTimeline: this.sanitizeReplayTimelineForViewer(
          gameEngineService.getReplayTimeline(uuid),
          canViewDebugPayload
        ),
        runtimeStatus: {
          source,
          persisted: source === 'restored',
          inMemory: true,
        },
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
    const canViewDebugPayload = this.canViewDebugPayload(user.normalizedRole)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return response.status(404).json({ error: i18n.t('games.errors.notFoundOrFinished') })
    }
    const { session, source } = resolvedSession

    const isSpectator = !isUserInGameSession(session, user.userUuid)
    const playerView = isSpectator
      ? toSpectatorPlayerView({ session, currentUserUuid: user.userUuid })
      : gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = isSpectator
      ? []
      : gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(
      toGameApiPayload({
        session,
        playerView,
        availableActions,
        isSpectator,
        replayTimeline: this.sanitizeReplayTimelineForViewer(
          gameEngineService.getReplayTimeline(uuid),
          canViewDebugPayload
        ),
        runtimeStatus: {
          source,
          persisted: source === 'restored',
          inMemory: true,
        },
      })
    )
  }

  /**
   * Get available actions for current player
   */
  async getActions({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }
    const { session } = resolvedSession

    const isSpectator = !isUserInGameSession(session, user.userUuid)
    const availableActions = isSpectator
      ? []
      : gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(
      toGameActionsPayload({
        session,
        availableActions,
        currentUserUuid: user.userUuid,
        isSpectator,
      })
    )
  }

  /**
   * Execute a game action (draw card, play card)
   */
  async action({ params, request, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)
    const body = (await request.validateUsing(gameActionBodyValidator)) as RawGameActionInput

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }
    const { session } = resolvedSession
    if (!isUserInGameSession(session, user.userUuid)) {
      return response.status(403).json({ error: i18n.t('games.errors.spectatorsCannotAct') })
    }

    const parsedAction = parseGameActionInput(body)
    if (!parsedAction.ok) {
      return response.status(400).json({
        error: this.translateGameActionError(
          i18n,
          parsedAction.error,
          'games.errors.invalidAction'
        ),
      })
    }

    const result = executeParsedGameAction(uuid, user.userUuid, parsedAction.value, {
      drawCard: (gameUuid, userUuid) => gameEngineService.drawCard(gameUuid, userUuid),
      playCard: (gameUuid, userUuid, cardType, targetPlayerId, guessedCard) =>
        gameEngineService.playCard(gameUuid, userUuid, cardType, targetPlayerId, guessedCard),
      executeAction: (engineAction) => gameEngineService.executeAction(engineAction),
    })

    if (!result.success) {
      return response.status(400).json({
        error: this.translateGameActionError(i18n, result.error, 'games.errors.actionRejected'),
      })
    }

    await this.persistSessionSnapshot(session).catch((error) => {
      logger.error({ error, gameUuid: uuid }, 'Failed to persist game snapshot after action')
    })

    const playerView = gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(
      toActionResponsePayload({
        actionResult: result,
        playerView,
        availableActions,
        includeDebugPayload: this.canViewDebugPayload(user.normalizedRole),
      })
    )
  }

  /**
   * Get all players' public state (for spectators or between turns)
   */
  async getPlayers({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await gameUuidParamValidator.validate(params)

    const resolvedSession = await this.resolveRuntimeSession(uuid)
    if (!resolvedSession) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }
    const { session } = resolvedSession

    return response.json(toPublicPlayersPayload({ session, currentUserUuid: user.userUuid }))
  }

  /**
   * Get replay timeline for live or persisted games.
   */
  async replay({ params, response, auth, i18n }: HttpContext) {
    const user = auth.user
    const { uuid } = await gameUuidParamValidator.validate(params)
    const actorId = user?.userUuid ?? 'anonymous'
    const canViewDebugPayload = this.canViewDebugPayload(user?.normalizedRole)

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
        replayTimeline: this.sanitizeReplayTimelineForViewer(replayTimeline, canViewDebugPayload),
      })
    }

    const persistedGame = await this.gameRepository.findByUuid(uuid)
    if (!persistedGame) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    const replayTimeline = this.extractPersistedReplayTimeline(persistedGame)
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
      replayTimeline: this.sanitizeReplayTimelineForViewer(replayTimeline, canViewDebugPayload),
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

    const persistedGame = await this.gameRepository.findByUuid(uuid)
    if (!persistedGame) {
      return response.status(404).json({ error: i18n.t('games.errors.notFound') })
    }

    const normalizedReplayTimeline = body.replayTimeline
      .map((rawStep, index) => this.normalizeReplayStep(rawStep, index))
      .filter((step): step is GameReplayStep => step !== null)

    if (normalizedReplayTimeline.length !== body.replayTimeline.length) {
      return response.status(422).json({
        error: i18n.t('games.errors.replayImportPayloadInvalid'),
      })
    }

    const guardDecision = await replayImportGuardService.verifyImport({
      payload: {
        gameId: uuid,
        replayTimeline: normalizedReplayTimeline,
      },
      actorId,
      targetId: uuid,
      source: 'external',
      envelope: (body.envelope ?? null) as StableSignedEnvelope<Record<string, unknown>> | null,
    })
    if (!guardDecision.allowed) {
      return response.status(422).json({
        error: i18n.t('games.errors.importVerificationFailed'),
        reason: guardDecision.reason,
      })
    }

    const currentGameData = this.asRecord(persistedGame.gameData) ?? {}
    const currentRuntime = this.asRecord(currentGameData.runtime) ?? {}
    const nextGameData = {
      ...currentGameData,
      runtime: {
        ...currentRuntime,
        replayTimeline: normalizedReplayTimeline,
        replayEnvelope: body.envelope ?? currentRuntime.replayEnvelope ?? null,
        importedAt: new Date().toISOString(),
        importedBy: actorId,
      },
    }

    await this.gameRepository.save(
      Game.reconstitute(
        persistedGame.uuid,
        persistedGame.status,
        persistedGame.players,
        nextGameData as GameStateData,
        persistedGame.startedAt,
        persistedGame.finishedAt
      )
    )

    return response.json({
      gameId: uuid,
      importedSteps: normalizedReplayTimeline.length,
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

    const snapshot = this.extractPersistedSnapshot(persistedGame)
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

  private extractPersistedSnapshot(game: Game): {
    gameType: string
    lobbyId: string
    settings: Record<string, unknown>
    engineState: Record<string, unknown>
    replayTimeline: GameReplayStep[]
  } | null {
    const gameData = this.asRecord(game.gameData)
    if (!gameData) {
      return null
    }
    const runtime = this.asRecord(gameData.runtime) ?? {}
    const runtimeEngineState = this.asRecord(runtime.engineState)
    const legacyEngineState = this.hasLegacyEngineStateShape(gameData) ? gameData : undefined

    const engineState = runtimeEngineState ?? legacyEngineState
    if (!engineState) {
      return null
    }

    const gameType =
      (typeof runtime.gameType === 'string' ? runtime.gameType : undefined) ||
      (typeof gameData.gameType === 'string' ? (gameData.gameType as string) : undefined)
    if (!gameType) {
      return null
    }

    const lobbyId =
      (typeof runtime.lobbyId === 'string' ? runtime.lobbyId : undefined) || `restored-${game.uuid}`

    return {
      gameType,
      lobbyId,
      settings: this.asRecord(runtime.settings) ?? {},
      engineState,
      replayTimeline: this.extractPersistedReplayTimeline(game),
    }
  }

  private extractPersistedReplayTimeline(game: Game): GameReplayStep[] {
    const gameData = this.asRecord(game.gameData)
    if (!gameData) {
      return []
    }

    const runtime = this.asRecord(gameData.runtime)
    if (!runtime || !Array.isArray(runtime.replayTimeline)) {
      return []
    }

    return runtime.replayTimeline
      .map((rawStep, index) => this.normalizeReplayStep(rawStep, index))
      .filter((step): step is GameReplayStep => step !== null)
  }

  private extractPersistedReplayEnvelope(game: Game): Record<string, unknown> | null {
    const gameData = this.asRecord(game.gameData)
    if (!gameData) {
      return null
    }

    const runtime = this.asRecord(gameData.runtime)
    if (!runtime) {
      return null
    }

    return this.asRecord(runtime.replayEnvelope)
  }

  private normalizeReplayStep(rawStep: unknown, index: number): GameReplayStep | null {
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
          const choicesSource = this.asRecord(round.choices) ?? {}
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

    const scoresSource = this.asRecord(snapshot?.scores) ?? {}
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

    const roundChoicesSource = this.asRecord(snapshot?.roundChoices) ?? {}
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
      actionPayload: this.asRecord(source.actionPayload) ?? undefined,
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

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    return null
  }

  private hasLegacyEngineStateShape(value: Record<string, unknown>): boolean {
    return Array.isArray(value.players) && typeof value.phase === 'string'
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
      options?.statusOverride ??
      (session.state.isFinished ? GameStatus.FINISHED : GameStatus.IN_PROGRESS)
    const replayTimeline = Array.isArray(session.timeline) ? session.timeline : []
    const replayEnvelope = replayImportGuardService.signReplayPayload({
      gameId: session.gameId,
      replayTimeline,
    })

    const persistedGame = Game.reconstitute(
      session.gameId,
      resolvedStatus,
      session.players.map((player) => ({
        uuid: player.id,
        nickName: player.name,
      })),
      {
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
          replayEnvelope: replayEnvelope ?? undefined,
          persistedAt: new Date().toISOString(),
          runtimeStatus,
          abandonReason: options?.abandonReason,
        },
      },
      session.createdAt,
      [GameStatus.FINISHED, GameStatus.ABANDONED, GameStatus.ARCHIVED].includes(resolvedStatus)
        ? new Date()
        : undefined
    )

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

  private canViewDebugPayload(role?: string): boolean {
    return role === 'ADMIN'
  }

  private sanitizeReplayTimelineForViewer(
    timeline: GameReplayStep[],
    canViewDebugPayload: boolean
  ): GameReplayStep[] {
    if (canViewDebugPayload) {
      return timeline
    }

    return timeline.map((step) => ({
      ...step,
      actionPayload: undefined,
      events: step.events.map((event) => ({
        type: event.type,
        payload: undefined,
      })),
    }))
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
        ? this.extractPersistedReplayEnvelope(options.persistedGame)
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
