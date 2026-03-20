import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { CreateLobbyUseCase } from '#application/use_cases/create_lobby_use_case'
import { JoinLobbyUseCase } from '#application/use_cases/join_lobby_use_case'
import { LeaveLobbyUseCase } from '#application/use_cases/leave_lobby_use_case'
import { StartGameUseCase } from '#application/use_cases/start_game_use_case'
import { ListLobbiesUseCase } from '#application/use_cases/list_lobbies_use_case'
import { ShowLobbyUseCase } from '#application/use_cases/show_lobby_use_case'
import { KickPlayerUseCase } from '#application/use_cases/kick_player_use_case'
import { CloseLobbyUseCase } from '#application/use_cases/close_lobby_use_case'
import BusinessException from '#exceptions/business_exception'
import {
  LobbyCreationException,
  InvalidLobbyConfigurationException,
  LobbyCreationInternalException,
} from '#exceptions/lobby_exceptions'
import { lobbyStoreValidator } from '#validators/lobby_store_validator'
import {
  lobbyAdminCloseValidator,
  lobbyInvitationCodeParamValidator,
  lobbyJoinValidator,
  lobbyKickPlayerValidator,
  lobbyUuidParamValidator,
} from '#validators/lobby_action_validators'
import { lobbyBeaconPayloadValidator } from '#validators/lobby_beacon_validator'
import { toUserSummary } from '#presenters/lobby_presenter'
import type { HttpRequest, HttpResponse } from '@adonisjs/core/http'
import type { Session } from '@adonisjs/session'
import { defaultGameCatalog } from '#infrastructure/game_engine/launcher_game_catalog'
import { LobbyPresenceService } from '#application/services/lobby_presence_service'

type AvailableGameViewModel = {
  id: string
  displayName: string
  description: string
  minPlayers: number
  maxPlayers: number
}

type CreateLobbySettingsInput = {
  roundsToWin?: number
  allowDrawReplay?: boolean
}

const LOBBY_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  'Lobby not found': 'lobbies.errors.notFound',
  'Player not found': 'lobbies.errors.playerNotFound',
  'Player is already in a lobby': 'lobbies.errors.playerAlreadyInLobby',
  'Password is required for this lobby': 'lobbies.errors.passwordRequired',
  'Invalid lobby password': 'lobbies.errors.invalidPassword',
  'Lobby is full': 'lobbies.errors.full',
  'Player is not in this lobby': 'lobbies.errors.playerNotInLobby',
  'Player not found in lobby': 'lobbies.errors.playerNotInLobby',
  'Only the lobby creator can start the game': 'lobbies.errors.onlyCreatorCanStart',
  'Lobby is not ready to start a game': 'lobbies.errors.lobbyNotReady',
  'Failed to start game': 'lobbies.errors.startFailed',
  'Only the lobby creator can kick players': 'lobbies.errors.onlyCreatorCanKick',
  'Target player is not in this lobby': 'lobbies.errors.targetNotInLobby',
  'Cannot kick players from a game in progress': 'lobbies.errors.cannotKickInProgress',
  'Cannot close a lobby while a game is starting': 'lobbies.errors.cannotCloseStarting',
  'Lobby UUID is required': 'lobbies.errors.lobbyUuidRequired',
  'User UUID is required': 'lobbies.errors.userUuidRequired',
  'Closer user UUID is required': 'lobbies.errors.userUuidRequired',
}

@inject()
export default class EnhancedLobbiesController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private startGameUseCase: StartGameUseCase,
    private listLobbiesUseCase: ListLobbiesUseCase,
    private showLobbyUseCase: ShowLobbyUseCase,
    private kickPlayerUseCase: KickPlayerUseCase,
    private closeLobbyUseCase: CloseLobbyUseCase,
    private lobbyPresenceService: LobbyPresenceService
  ) {}

  /**
   * Display welcome page
   */
  async welcome({ inertia, auth }: HttpContext) {
    const user = auth.user

    return inertia.render('welcome', {
      user: user ? toUserSummary(user, { includeEmail: true }) : null,
      currentLobby: null,
    })
  }

  private sanitizeGameSettings(gameType: string, gameSettings?: CreateLobbySettingsInput) {
    if (gameType !== 'rock-paper-scissors') {
      return {}
    }

    const roundsToWinRaw = gameSettings?.roundsToWin
    const roundsToWin = Number.isFinite(roundsToWinRaw) ? Number(roundsToWinRaw) : 3
    const allowDrawReplay = gameSettings?.allowDrawReplay ?? true

    if (!Number.isInteger(roundsToWin) || roundsToWin < 1 || roundsToWin > 10) {
      throw new InvalidLobbyConfigurationException(
        'gameSettings.roundsToWin',
        roundsToWinRaw,
        'roundsToWin must be an integer between 1 and 10'
      )
    }

    return {
      roundsToWin,
      allowDrawReplay,
    }
  }

  private getAvailableGames(): AvailableGameViewModel[] {
    return defaultGameCatalog.listGames({ includeProprietary: false }).map((game) => ({
      id: game.id,
      displayName: game.displayName,
      description: game.description,
      minPlayers: game.playerConstraints.minPlayers,
      maxPlayers: game.playerConstraints.maxPlayers,
    }))
  }

  /**
   * Display lobbies index page
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const canModerate = user.normalizedRole === 'MODERATOR' || user.normalizedRole === 'ADMIN'

    try {
      const result = await this.listLobbiesUseCase.execute({
        includePrivate: canModerate,
        viewerUserUuid: user.userUuid,
        viewerRole: user.normalizedRole,
      })

      if (result.isFailure) {
        logger.error({ error: result.error }, 'Failed to load lobbies')
        return inertia.render('lobbies', {
          lobbies: [],
          user: toUserSummary(user, { includeEmail: true }),
          currentLobby: null,
        })
      }

      return inertia.render('lobbies', {
        lobbies: result.value.lobbies,
        user: toUserSummary(user, { includeEmail: true }),
        currentLobby: null,
      })
    } catch (error) {
      logger.error({ error }, 'Failed to load lobbies')
      return inertia.render('lobbies', {
        lobbies: [],
        user: toUserSummary(user, { includeEmail: true }),
        currentLobby: null,
      })
    }
  }

  /**
   * Display create lobby form
   */
  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const availableGames = this.getAvailableGames()

    return inertia.render('create-lobby', {
      user: toUserSummary(user),
      currentLobby: null,
      availableGames,
    })
  }

  /**
   * Create a new lobby with advanced features
   */
  async store({ request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    try {
      const {
        name,
        description,
        maxPlayers,
        isPrivate = false,
        hasPassword = false,
        password,
        gameType,
        gameSettings,
      } = await request.validateUsing(lobbyStoreValidator)

      const selectedGame = this.getAvailableGames().find((game) => game.id === gameType)
      if (!selectedGame) {
        throw new InvalidLobbyConfigurationException(
          'gameType',
          gameType,
          `Selected game '${gameType}' is not available`
        )
      }

      if (maxPlayers < selectedGame.minPlayers || maxPlayers > selectedGame.maxPlayers) {
        throw new InvalidLobbyConfigurationException(
          'maxPlayers',
          maxPlayers,
          `For ${selectedGame.displayName}, maxPlayers must be between ${selectedGame.minPlayers} and ${selectedGame.maxPlayers}`
        )
      }

      if (hasPassword && (!password || password.trim().length === 0)) {
        throw new InvalidLobbyConfigurationException(
          'password',
          password,
          'Password is required when password protection is enabled'
        )
      }

      const sanitizedGameSettings = this.sanitizeGameSettings(gameType, gameSettings)

      const result = await this.createLobbyUseCase.execute({
        userUuid: user.userUuid,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : undefined,
        maxPlayers,
        isPrivate: Boolean(isPrivate),
        password: hasPassword ? password?.trim() : undefined,
        gameType,
        gameSettings: sanitizedGameSettings,
      })

      if (result.isFailure) {
        throw new LobbyCreationException(result.error, `Use case execution failed: ${result.error}`)
      }

      session.flash('success', i18n.t('lobbies.flash.created'))
      return response.redirect(`/lobbies/${result.value.uuid}`)
    } catch (error) {
      // Let validation errors bubble to the global handler
      if ((error as any)?.code === 'E_VALIDATION_ERROR') {
        throw error
      }

      // If it's already a BusinessException, let it handle itself
      if (error instanceof BusinessException) {
        throw error
      }

      // Wrap unexpected errors
      throw new LobbyCreationInternalException(error as Error, user.userUuid, {
        name: request.input('name'),
        description: request.input('description'),
        maxPlayers: request.input('maxPlayers'),
        isPrivate: request.input('isPrivate'),
        hasPassword: request.input('hasPassword'),
        gameType: request.input('gameType'),
      })
    }
  }

  /**
   * Display specific lobby
   */
  async show({ params, inertia, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: uuid })
      if (result.isFailure) {
        return inertia.render('errors/not_found', {
          error: { message: i18n.t('lobbies.errors.notFound') },
        })
      }

      const isUserInLobby = result.value.players.some((player) => player.uuid === user.userUuid)
      if (isUserInLobby) {
        this.lobbyPresenceService.markConnected({
          lobbyUuid: uuid,
          userUuid: user.userUuid,
        })
      }

      return inertia.render('lobby', {
        lobby: this.toLobbyViewModel(result.value) as any,
        user: { uuid: user.userUuid, nickName: user.fullName },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to load lobby')
      return inertia.render('errors/server_error', {
        error: { message: i18n.t('lobbies.errors.loadFailed') },
      })
    }
  }

  /**
   * Display join lobby page by invitation code
   */
  async showJoinByInvite({ params, inertia, auth, i18n }: HttpContext) {
    const { invitationCode } = await lobbyInvitationCodeParamValidator.validate(params)
    const user = auth.user

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: invitationCode })
      if (result.isFailure) {
        return inertia.render('errors/not_found', {
          error: { message: i18n.t('lobbies.errors.invitationInvalid') },
        })
      }

      return inertia.render('join-lobby', {
        lobby: this.toLobbyViewModel(result.value, invitationCode) as any,
        user: user ? toUserSummary(user) : null,
        invitationCode,
      })
    } catch (error) {
      logger.error({ error }, 'Failed to load lobby for invitation')
      return inertia.render('errors/server_error', {
        error: { message: i18n.t('lobbies.errors.loadFailed') },
      })
    }
  }

  /**
   * Join a lobby by invitation code
   */
  async joinByInvite({ params, request, response, auth, session, i18n }: HttpContext) {
    const { invitationCode } = await lobbyInvitationCodeParamValidator.validate(params)
    const user = auth.user!
    const { password } = await request.validateUsing(lobbyJoinValidator)

    try {
      const result = await this.joinLobbyUseCase.execute({
        lobbyUuid: invitationCode,
        userUuid: user.userUuid,
        password: typeof password === 'string' ? password : undefined,
      })

      if (result.isFailure) {
        session.flash('error', this.translateUseCaseError(i18n, result.error))
        return response.redirect().back()
      }

      this.lobbyPresenceService.markConnected({
        lobbyUuid: invitationCode,
        userUuid: user.userUuid,
      })

      session.flash('success', i18n.t('lobbies.flash.joined'))
      return response.redirect(`/lobbies/${invitationCode}`)
    } catch (error) {
      logger.error({ error }, 'Failed to join lobby by invitation')
      session.flash('error', i18n.t('lobbies.flash.joinFailed'))
      return response.redirect().back()
    }
  }

  /**
   * Join a lobby (regular join)
   */
  async join({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)
    const { password } = await request.validateUsing(lobbyJoinValidator)

    try {
      const result = await this.joinLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
        password: typeof password === 'string' ? password : undefined,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({
          request,
          response,
          session,
          i18n,
          error: result.error,
        })
      }

      this.lobbyPresenceService.markConnected({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (request.accepts(['html'])) {
        session.flash('success', i18n.t('lobbies.flash.joined'))
        return response.redirect(`/lobbies/${uuid}`)
      }

      return response.json({
        success: true,
        message: i18n.t('lobbies.api.joined'),
      })
    } catch (error) {
      return this.respondUnexpectedFailure({
        request,
        response,
        session,
        error,
        logMessage: 'Failed to join lobby',
        userMessage: i18n.t('lobbies.flash.joinFailed'),
        apiMessage: i18n.t('lobbies.api.joinFailed'),
      })
    }
  }

  /**
   * Leave a lobby
   */
  async leave({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)

    try {
      this.lobbyPresenceService.cancelPendingLeave({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      const result = await this.leaveLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({
          request,
          response,
          session,
          i18n,
          error: result.error,
        })
      }

      if (request.accepts(['html'])) {
        session.flash('success', i18n.t('lobbies.flash.left'))
        return response.redirect('/lobbies')
      }

      return response.status(200).json({
        success: true,
        message: i18n.t('lobbies.api.left'),
      })
    } catch (error) {
      return this.respondUnexpectedFailure({
        request,
        response,
        session,
        error,
        logMessage: 'Failed to leave lobby',
        userMessage: i18n.t('lobbies.flash.leaveFailed'),
        apiMessage: i18n.t('lobbies.api.leaveFailed'),
      })
    }
  }

  /**
   * Start a game from lobby
   */
  async start({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)

    try {
      const result = await this.startGameUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({
          request,
          response,
          session,
          i18n,
          error: result.error,
        })
      }

      const gameResponse = result.value
      const gameUuid = gameResponse.game.uuid

      if (request.accepts(['html'])) {
        return response.redirect(`/games/${gameUuid}`)
      }

      return response.json({
        success: true,
        gameUuid,
        game: gameResponse.game,
      })
    } catch (error) {
      return this.respondUnexpectedFailure({
        request,
        response,
        session,
        error,
        logMessage: 'Failed to start game',
        userMessage: i18n.t('lobbies.flash.startFailed'),
        apiMessage: i18n.t('lobbies.api.startFailed'),
      })
    }
  }

  /**
   * Kick a player from lobby (owner only)
   */
  async kickPlayer({ params, request, response, auth, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)
    const { playerUuid } = await request.validateUsing(lobbyKickPlayerValidator)

    try {
      const result = await this.kickPlayerUseCase.execute({
        lobbyUuid: uuid,
        kickerUuid: user.userUuid,
        targetPlayerUuid: playerUuid,
      })

      if (result.isFailure) {
        return response.status(400).json({
          error: this.translateUseCaseError(i18n, result.error),
        })
      }

      return response.json({
        success: true,
        message: i18n.t('lobbies.api.kicked'),
      })
    } catch (error) {
      logger.error({ error }, 'Failed to kick player')
      return response.status(500).json({
        error: i18n.t('lobbies.api.kickFailed'),
      })
    }
  }

  /**
   * Transfer lobby ownership (owner only)
   */
  async transferOwnership({ response, i18n }: HttpContext) {
    return response.status(501).json({ error: i18n.t('lobbies.api.transferNotImplemented') })
  }

  /**
   * Close a lobby as moderator/admin
   */
  async adminClose({ params, request, response, auth, session, i18n }: HttpContext) {
    const user = auth.user!
    const { uuid } = await lobbyUuidParamValidator.validate(params)
    const { reason } = await request.validateUsing(lobbyAdminCloseValidator)

    try {
      const result = await this.closeLobbyUseCase.execute({
        lobbyUuid: uuid,
        closedByUserUuid: user.userUuid,
        closedByRole: user.normalizedRole,
        reason: typeof reason === 'string' ? reason : undefined,
      })

      if (result.isFailure) {
        const status = result.error === 'Lobby not found' ? 404 : 400
        if (request.accepts(['html'])) {
          session.flash('error', this.translateUseCaseError(i18n, result.error))
          return response.redirect('/lobbies')
        }
        return response.status(status).json({
          error: this.translateUseCaseError(i18n, result.error),
        })
      }

      logger.info(
        {
          lobbyUuid: result.value.lobbyUuid,
          reason: result.value.reason,
          closedByUserUuid: user.userUuid,
          closedByRole: user.normalizedRole,
        },
        'Lobby closed by moderation action'
      )

      if (request.accepts(['html'])) {
        session.flash('success', i18n.t('lobbies.flash.closed'))
        return response.redirect('/lobbies')
      }

      return response.json({
        success: true,
        lobbyUuid: result.value.lobbyUuid,
        reason: result.value.reason,
        closedAt: result.value.closedAt,
        closedBy: {
          uuid: user.userUuid,
          role: user.normalizedRole,
        },
      })
    } catch (error) {
      logger.error({ error, lobbyUuid: uuid }, 'Failed to close lobby')
      return response.status(500).json({ error: i18n.t('lobbies.api.closeFailed') })
    }
  }

  /**
   * API endpoint to get lobby data
   */
  async apiShow({ params, response, i18n }: HttpContext) {
    const { uuid } = await lobbyUuidParamValidator.validate(params)

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: uuid })
      if (result.isFailure) {
        return response.status(404).json({ error: i18n.t('lobbies.errors.notFound') })
      }

      return response.json({
        lobby: this.toLobbyViewModel(result.value),
      })
    } catch (error) {
      logger.error({ error }, 'Failed to get lobby')
      return response.status(500).json({ error: i18n.t('lobbies.api.getFailed') })
    }
  }

  /**
   * API endpoint to get all lobbies
   */
  async apiIndex({ response, auth, i18n }: HttpContext) {
    const user = auth.user
    const canModerate =
      user?.normalizedRole === 'MODERATOR' || user?.normalizedRole === 'ADMIN'

    try {
      const result = await this.listLobbiesUseCase.execute({
        includePrivate: canModerate,
        viewerUserUuid: user?.userUuid,
        viewerRole: user?.normalizedRole,
      })
      if (result.isFailure) {
        return response.status(500).json({ error: this.translateUseCaseError(i18n, result.error) })
      }

      return response.json({ lobbies: result.value.lobbies })
    } catch (error) {
      logger.error({ error }, 'Failed to get lobbies')
      return response.status(500).json({ error: i18n.t('lobbies.api.listFailed') })
    }
  }

  /**
   * Handle leave lobby on page close/navigation (beacon requests)
   */
  async leaveOnClose({ request, response, auth, i18n }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.status(401).json({ error: i18n.t('http.errors.unauthorized') })
      }

      const { lobbyUuid, userUuid, clientSessionId } = await lobbyBeaconPayloadValidator.validate(
        this.parseBeaconPayload(request.body())
      )
      if (!lobbyUuid) {
        return response.status(400).json({ error: i18n.t('lobbies.errors.lobbyUuidRequired') })
      }

      // Validate that the user can only leave their own sessions
      if (userUuid && userUuid !== user.userUuid) {
        return response.status(403).json({ error: i18n.t('http.errors.forbidden') })
      }

      const scheduling = this.lobbyPresenceService.scheduleLeaveOnDisconnect(
        {
          lobbyUuid,
          userUuid: user.userUuid,
          clientSessionId,
        },
        async ({ lobbyUuid: delayedLobbyUuid, userUuid: delayedUserUuid }) => {
          const result = await this.leaveLobbyUseCase.execute({
            lobbyUuid: delayedLobbyUuid,
            userUuid: delayedUserUuid,
          })

          if (result.isFailure) {
            const error = result.error || ''
            const isAlreadyLeft =
              error.includes('Player is not in this lobby') || error.includes('not found')
            if (!isAlreadyLeft) {
              logger.warn(
                { lobbyUuid: delayedLobbyUuid, error: result.error },
                'Delayed leave on close failed'
              )
            }
          }
        }
      )

      return response.status(202).json({
        success: true,
        message: i18n.t('lobbies.api.leaveScheduled'),
        gracePeriodMs: scheduling.gracePeriodMs,
      })
    } catch (error) {
      if ((error as any)?.code === 'E_VALIDATION_ERROR') {
        return response.status(400).json({ error: i18n.t('http.errors.validationFailed') })
      }

      logger.error({ error }, 'Failed to leave lobby on close')
      return response.status(500).json({
        error: i18n.t('lobbies.api.leaveOnCloseFailed'),
      })
    }
  }

  /**
   * Receive lobby heartbeat from clients to cancel delayed leave-on-close.
   */
  async heartbeat({ params, request, response, auth, i18n }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.status(401).json({ error: i18n.t('http.errors.unauthorized') })
      }

      const { uuid } = await lobbyUuidParamValidator.validate(params)

      const { userUuid, clientSessionId } = await lobbyBeaconPayloadValidator.validate(
        this.parseBeaconPayload(request.body())
      )
      if (userUuid && userUuid !== user.userUuid) {
        return response.status(403).json({ error: i18n.t('http.errors.forbidden') })
      }

      this.lobbyPresenceService.markConnected({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
        clientSessionId,
      })

      return response.status(200).json({ success: true })
    } catch (error) {
      if ((error as any)?.code === 'E_VALIDATION_ERROR') {
        return response.status(400).json({ error: i18n.t('http.errors.validationFailed') })
      }

      logger.error({ error }, 'Failed to process lobby heartbeat')
      return response.status(500).json({ error: i18n.t('lobbies.api.heartbeatFailed') })
    }
  }

  private toLobbyViewModel<
    T extends { uuid: string; hasPassword?: boolean; description?: string | null }
  >(lobby: T, invitationCode?: string) {
    return {
      ...lobby,
      invitationCode: invitationCode ?? lobby.uuid,
      hasPassword: Boolean(lobby.hasPassword),
      description: typeof lobby.description === 'string' ? lobby.description : undefined,
    }
  }

  private respondUseCaseFailure({
    request,
    response,
    session,
    i18n,
    error,
  }: {
    request: HttpRequest
    response: HttpResponse
    session: Session
    i18n: HttpContext['i18n']
    error: string
  }) {
    const localizedError = this.translateUseCaseError(i18n, error)

    if (request.accepts(['html'])) {
      session.flash('error', localizedError)
      return response.redirect().back()
    }

    return response.status(400).json({ error: localizedError })
  }

  private respondUnexpectedFailure({
    request,
    response,
    session,
    error,
    logMessage,
    userMessage,
    apiMessage,
  }: {
    request: HttpRequest
    response: HttpResponse
    session: Session
    error: unknown
    logMessage: string
    userMessage: string
    apiMessage: string
  }) {
    logger.error({ error }, logMessage)

    if (request.accepts(['html'])) {
      session.flash('error', userMessage)
      return response.redirect().back()
    }

    return response.status(500).json({ error: apiMessage })
  }

  private translateUseCaseError(i18n: HttpContext['i18n'], error: string): string {
    const translatedKey = LOBBY_ERROR_TRANSLATION_KEYS[error]
    if (translatedKey) {
      return i18n.t(translatedKey)
    }

    return error
  }

  private parseBeaconPayload(body: unknown): {
    lobbyUuid?: string
    userUuid?: string
    clientSessionId?: string
  } {
    const normalize = (value: unknown) => {
      if (!value || typeof value !== 'object') {
        return { lobbyUuid: undefined, userUuid: undefined, clientSessionId: undefined }
      }

      const raw = value as Record<string, unknown>

      return {
        lobbyUuid: typeof raw.lobbyUuid === 'string' ? raw.lobbyUuid : undefined,
        userUuid: typeof raw.userUuid === 'string' ? raw.userUuid : undefined,
        clientSessionId:
          typeof raw.clientSessionId === 'string' && raw.clientSessionId.trim().length > 0
            ? raw.clientSessionId
            : undefined,
      }
    }

    if (!body) {
      return {}
    }

    if (typeof body === 'string') {
      try {
        return normalize(JSON.parse(body))
      } catch {
        return {}
      }
    }

    if (typeof body === 'object') {
      const rawBody = body as Record<string, unknown>

      if (typeof rawBody.payload === 'string') {
        try {
          return normalize(JSON.parse(rawBody.payload))
        } catch {
          return normalize(rawBody)
        }
      }

      return normalize(rawBody)
    }

    return {}
  }
}
