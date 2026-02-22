import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { CreateLobbyUseCase } from '../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../application/use_cases/start_game_use_case.js'
import { ListLobbiesUseCase } from '../application/use_cases/list_lobbies_use_case.js'
import { ShowLobbyUseCase } from '../application/use_cases/show_lobby_use_case.js'
import { KickPlayerUseCase } from '../application/use_cases/kick_player_use_case.js'
import BusinessException from '../exceptions/business_exception.js'
import {
  LobbyCreationException,
  InvalidLobbyConfigurationException,
  LobbyCreationInternalException,
} from '../exceptions/lobby_exceptions.js'
import { lobbyStoreValidator } from '#validators/lobby_store_validator'
import { toUserSummary } from '#presenters/lobby_presenter'
import type { Request } from '@adonisjs/core/http'
import type { Response } from '@adonisjs/core/http'
import type { Session } from '@adonisjs/session'
import { createDefaultLauncher } from '@infinity.dev/game-engine'

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

@inject()
export default class EnhancedLobbiesController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private startGameUseCase: StartGameUseCase,
    private listLobbiesUseCase: ListLobbiesUseCase,
    private showLobbyUseCase: ShowLobbyUseCase,
    private kickPlayerUseCase: KickPlayerUseCase
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
    const launcher = createDefaultLauncher()

    return launcher.listGames().map((game) => ({
      id: game.id,
      displayName: game.displayName,
      description: game.description,
      minPlayers: game.metadata.minPlayers,
      maxPlayers: game.metadata.maxPlayers,
    }))
  }

  /**
   * Display lobbies index page
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!

    try {
      const result = await this.listLobbiesUseCase.execute({ includePrivate: true })

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
  async store({ request, response, auth, session }: HttpContext) {
    const user = auth.user!
    try {
      const {
        name,
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
        maxPlayers,
        isPrivate: Boolean(isPrivate),
        gameType,
        gameSettings: sanitizedGameSettings,
      })

      if (result.isFailure) {
        throw new LobbyCreationException(result.error, `Use case execution failed: ${result.error}`)
      }

      session.flash('success', 'Lobby created successfully!')
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
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: uuid })
      if (result.isFailure) {
        return inertia.render('errors/not_found', {
          error: { message: 'Lobby not found' },
        })
      }

      return inertia.render('lobby', {
        lobby: this.toLobbyViewModel(result.value),
        user: { uuid: user.userUuid, nickName: user.fullName },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to load lobby')
      return inertia.render('errors/server_error', {
        error: { message: 'Failed to load lobby' },
      })
    }
  }

  /**
   * Display join lobby page by invitation code
   */
  async showJoinByInvite({ params, inertia, auth }: HttpContext) {
    const { invitationCode } = params
    const user = auth.user

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: invitationCode })
      if (result.isFailure) {
        return inertia.render('errors/not_found', {
          error: { message: 'Lobby not found or invitation expired' },
        })
      }

      return inertia.render('join-lobby', {
        lobby: this.toLobbyViewModel(result.value, invitationCode),
        user: user ? toUserSummary(user) : null,
        invitationCode,
      })
    } catch (error) {
      logger.error({ error }, 'Failed to load lobby for invitation')
      return inertia.render('errors/server_error', {
        error: { message: 'Failed to load lobby' },
      })
    }
  }

  /**
   * Join a lobby by invitation code
   */
  async joinByInvite({ params, response, auth, session }: HttpContext) {
    const { invitationCode } = params
    const user = auth.user!

    try {
      const result = await this.joinLobbyUseCase.execute({
        lobbyUuid: invitationCode,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Successfully joined the lobby!')
      return response.redirect(`/lobbies/${invitationCode}`)
    } catch (error) {
      logger.error({ error }, 'Failed to join lobby by invitation')
      session.flash('error', 'Failed to join lobby. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Join a lobby (regular join)
   */
  async join({ params, request, response, auth, session }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    try {
      const result = await this.joinLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({ request, response, session, error: result.error })
      }

      if (request.accepts(['html'])) {
        session.flash('success', 'Successfully joined the lobby!')
        return response.redirect(`/lobbies/${uuid}`)
      }

      return response.json({
        success: true,
        message: 'Successfully joined lobby',
      })
    } catch (error) {
      return this.respondUnexpectedFailure({
        request,
        response,
        session,
        error,
        logMessage: 'Failed to join lobby',
        userMessage: 'Failed to join lobby. Please try again.',
        apiMessage: 'Failed to join lobby',
      })
    }
  }

  /**
   * Leave a lobby
   */
  async leave({ params, request, response, auth, session }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    try {
      const result = await this.leaveLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({ request, response, session, error: result.error })
      }

      if (request.accepts(['html'])) {
        session.flash('success', 'Successfully left the lobby')
        return response.redirect('/lobbies')
      }

      return response.status(200).json({
        success: true,
        message: 'Successfully left lobby',
      })
    } catch (error) {
      return this.respondUnexpectedFailure({
        request,
        response,
        session,
        error,
        logMessage: 'Failed to leave lobby',
        userMessage: 'Failed to leave lobby. Please try again.',
        apiMessage: 'Failed to leave lobby',
      })
    }
  }

  /**
   * Start a game from lobby
   */
  async start({ params, request, response, auth, session }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    try {
      const result = await this.startGameUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        return this.respondUseCaseFailure({ request, response, session, error: result.error })
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
        userMessage: 'Failed to start game. Please try again.',
        apiMessage: 'Failed to start game',
      })
    }
  }

  /**
   * Kick a player from lobby (owner only)
   */
  async kickPlayer({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { playerUuid } = request.only(['playerUuid'])

    try {
      const result = await this.kickPlayerUseCase.execute({
        lobbyUuid: uuid,
        kickerUuid: user.userUuid,
        targetPlayerUuid: playerUuid,
      })

      if (result.isFailure) {
        return response.status(400).json({
          error: result.error,
        })
      }

      return response.json({
        success: true,
        message: 'Player kicked successfully',
      })
    } catch (error) {
      logger.error({ error }, 'Failed to kick player')
      return response.status(500).json({
        error: 'Failed to kick player',
      })
    }
  }

  /**
   * Transfer lobby ownership (owner only)
   */
  async transferOwnership({ response }: HttpContext) {
    return response.status(501).json({ error: 'Transfer ownership use case not implemented yet' })
  }

  /**
   * API endpoint to get lobby data
   */
  async apiShow({ params, response }: HttpContext) {
    const { uuid } = params

    try {
      const result = await this.showLobbyUseCase.execute({ lobbyUuid: uuid })
      if (result.isFailure) {
        return response.status(404).json({ error: 'Lobby not found' })
      }

      return response.json({
        lobby: this.toLobbyViewModel(result.value),
      })
    } catch (error) {
      logger.error({ error }, 'Failed to get lobby')
      return response.status(500).json({ error: 'Failed to get lobby' })
    }
  }

  /**
   * API endpoint to get all lobbies
   */
  async apiIndex({ response }: HttpContext) {
    try {
      const result = await this.listLobbiesUseCase.execute({ includePrivate: true })
      if (result.isFailure) {
        return response.status(500).json({ error: result.error })
      }

      return response.json({ lobbies: result.value.lobbies })
    } catch (error) {
      logger.error({ error }, 'Failed to get lobbies')
      return response.status(500).json({ error: 'Failed to get lobbies' })
    }
  }

  /**
   * Handle leave lobby on page close/navigation (beacon requests)
   */
  async leaveOnClose({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' })
      }

      const { lobbyUuid, userUuid } = request.body()

      // Validate that the user can only leave their own sessions
      if (userUuid !== user.userUuid) {
        return response.status(403).json({ error: 'Forbidden' })
      }

      const result = await this.leaveLobbyUseCase.execute({
        lobbyUuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        logger.warn(
          { userUuid: user.userUuid, lobbyUuid, error: result.error },
          'Leave on close failed'
        )
        return response.status(400).json({ error: result.error })
      }

      return response.status(200).json({
        success: true,
        message: 'Successfully left lobby on close',
      })
    } catch (error) {
      logger.error({ error }, 'Failed to leave lobby on close')
      return response.status(500).json({
        error: 'Failed to leave lobby on close',
      })
    }
  }

  private toLobbyViewModel<T extends { uuid: string }>(lobby: T, invitationCode?: string) {
    return {
      ...lobby,
      invitationCode: invitationCode ?? lobby.uuid,
      hasPassword: false,
    }
  }

  private respondUseCaseFailure({
    request,
    response,
    session,
    error,
  }: {
    request: Request
    response: Response
    session: Session
    error: string
  }) {
    if (request.accepts(['html'])) {
      session.flash('error', error)
      return response.redirect().back()
    }

    return response.status(400).json({ error })
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
    request: Request
    response: Response
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
}
