import { HttpContext } from '@adonisjs/core/http'
import BusinessException from '#exceptions/business_exception'
import { ErrorClassification, ErrorSeverity } from '#exceptions/types/error_classification'
import { inject } from '@adonisjs/core'
import { CreateLobbyUseCase } from '../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../application/use_cases/start_game_use_case.js'
import { ListLobbiesUseCase } from '../application/use_cases/list_lobbies_use_case.js'
import { ShowLobbyUseCase } from '../application/use_cases/show_lobby_use_case.js'
import { KickPlayerUseCase } from '../application/use_cases/kick_player_use_case.js'
import { UpdateLobbySettingsUseCase } from '../application/use_cases/update_lobby_settings_use_case.js'
import { SetPlayerReadyUseCase } from '../application/use_cases/set_player_ready_use_case.js'

@inject()
export default class LobbiesController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private startGameUseCase: StartGameUseCase,
    private listLobbiesUseCase: ListLobbiesUseCase,
    private showLobbyUseCase: ShowLobbyUseCase,
    private kickPlayerUseCase: KickPlayerUseCase,
    private updateLobbySettingsUseCase: UpdateLobbySettingsUseCase,
    private setPlayerReadyUseCase: SetPlayerReadyUseCase
  ) {}

  /**
   * Display lobbies list page
   */
  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.user!
    const { status, isPrivate, hasAvailableSlots } = request.qs()

    const result = await this.listLobbiesUseCase.execute({
      status,
      includePrivate: isPrivate ? Boolean(isPrivate) : undefined,
      hasSlots: hasAvailableSlots ? Boolean(hasAvailableSlots) : undefined,
    })

    if (result.isFailure) {
      return inertia.render('errors/server_error', {
        error: { message: result.error },
      })
    }

    return inertia.render('lobbies', {
      lobbies: result.value.lobbies,
      total: result.value.total,
      user: {
        uuid: user.uuid,
        nickName: user.fullName,
      },
    })
  }

  /**
   * Display create lobby form
   */
  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!

    return inertia.render('create-lobby', {
      user: {
        uuid: user.uuid,
        nickName: user.fullName,
      },
    })
  }

  /**
   * Create a new lobby
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const {
      name,
      maxPlayers = 4,
      isPrivate = false,
    } = request.only(['name', 'maxPlayers', 'isPrivate'])

    const result = await this.createLobbyUseCase.execute({
      name,
      maxPlayers: Number.parseInt(maxPlayers),
      isPrivate,
      userUuid: user.uuid,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    const lobby = result.value
    return response.redirect(`/lobbies/${lobby.uuid}`)
  }

  /**
   * Display specific lobby
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const result = await this.showLobbyUseCase.execute({
      lobbyUuid: uuid,
    })

    if (result.isFailure) {
      return inertia.render('errors/not_found', {
        error: { message: result.error },
      })
    }

    return inertia.render('lobby', {
      lobby: result.value,
      user: {
        uuid: user.uuid,
        nickName: user.fullName,
      },
    })
  }

  /**
   * Join a lobby
   */
  async join({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const result = await this.joinLobbyUseCase.execute({
      userUuid: user.uuid,
      lobbyUuid: uuid,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.redirect(`/lobbies/${uuid}`)
  }

  /**
   * Quitter un lobby
   */
  async leave({ params, auth, response }: HttpContext) {
    const userUuid = auth.user!.userUuid
    const { lobbyUuid } = params

    const result = await this.leaveLobbyUseCase.execute({
      lobbyUuid,
      userUuid,
    })

    if (result.isFailure) {
      throw new BusinessException(result.error || 'Failed to leave lobby', {
        classification: ErrorClassification.USER_SAFE,
        severity: ErrorSeverity.MEDIUM,
        userMessage: result.error || 'Failed to leave lobby',
      })
    }

    return response.redirect().toRoute('lobbies.index')
  }

  /**
   * Quitter un lobby lors de la fermeture de page (via sendBeacon)
   */
  async leaveOnClose({ request, auth, response }: HttpContext) {
    const userUuid = auth.user!.userUuid
    const { lobbyUuid } = request.body()

    const result = await this.leaveLobbyUseCase.execute({
      lobbyUuid,
      userUuid,
    })

    if (result.isFailure) {
      return response.status(500).json({ error: result.error })
    }

    return response.json({ success: true })
  }

  /**
   * Start a game from lobby
   */
  async start({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const result = await this.startGameUseCase.execute({
      lobbyUuid: uuid,
      userUuid: user.uuid,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    const gameUuid = result.value
    return response.redirect(`/games/${gameUuid}`)
  }

  /**
   * API endpoint to get lobby data
   */
  async apiShow({ params, response }: HttpContext) {
    const { uuid } = params

    const result = await this.showLobbyUseCase.execute({
      lobbyUuid: uuid,
    })

    if (result.isFailure) {
      return response.status(404).json({
        error: result.error,
      })
    }

    return response.json({
      lobby: result.value,
    })
  }

  /**
   * API endpoint to get all lobbies
   */
  async apiIndex({ response, request }: HttpContext) {
    const { status, isPrivate, hasAvailableSlots } = request.qs()

    const result = await this.listLobbiesUseCase.execute({
      status,
      includePrivate: isPrivate ? Boolean(isPrivate) : undefined,
      hasSlots: hasAvailableSlots ? Boolean(hasAvailableSlots) : undefined,
    })

    if (result.isFailure) {
      return response.status(500).json({
        error: result.error,
      })
    }

    return response.json(result.value)
  }

  /**
   * Kick a player from lobby
   */
  async kickPlayer({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { playerUuid } = request.only(['playerUuid'])

    const result = await this.kickPlayerUseCase.execute({
      lobbyUuid: uuid,
      kickerUuid: user.uuid,
      targetPlayerUuid: playerUuid,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.json({ success: true })
  }

  /**
   * Update lobby settings
   */
  async updateSettings({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { name, maxPlayers, isPrivate } = request.only(['name', 'maxPlayers', 'isPrivate'])

    const result = await this.updateLobbySettingsUseCase.execute({
      lobbyUuid: uuid,
      updaterUuid: user.uuid,
      settings: {
        name,
        maxPlayers: maxPlayers ? Number.parseInt(maxPlayers) : undefined,
        isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : undefined,
      },
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.json(result.value)
  }

  /**
   * Set player ready status
   */
  async setPlayerReady({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { isReady } = request.only(['isReady'])

    const result = await this.setPlayerReadyUseCase.execute({
      lobbyUuid: uuid,
      playerUuid: user.uuid,
      isReady: Boolean(isReady),
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.json(result.value)
  }
}
