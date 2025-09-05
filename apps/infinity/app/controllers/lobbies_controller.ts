import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'
import { CreateLobbyUseCase } from '../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../application/use_cases/start_game_use_case.js'
import { LobbyRepository } from '../domain/repositories/lobby_repository.js'
import { UserRepository } from '../domain/repositories/user_repository.js'

@inject()
export default class LobbiesController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private startGameUseCase: StartGameUseCase,
    private lobbyRepository: LobbyRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Display lobbies list page
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!
    const lobbies = await this.lobbyRepository.findAll()

    return inertia.render('lobbies', {
      lobbies: lobbies.map((lobby) => lobby.serialize()),
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
      createdBy: user.uuid,
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

    const lobby = await this.lobbyRepository.findByUuid(uuid)
    if (!lobby) {
      return inertia.render('errors/not_found', {
        error: { message: 'Lobby not found' },
      })
    }

    return inertia.render('lobby', {
      lobby: lobby.serialize(),
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

    // Get user from repository
    const userEntity = await this.userRepository.findByUuid(user.uuid)
    if (!userEntity) {
      return response.status(404).json({
        error: 'User not found',
      })
    }

    const result = await this.joinLobbyUseCase.execute({
      lobbyUuid: uuid,
      playerUuid: user.uuid,
      playerNickName: userEntity.fullName,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.redirect(`/lobbies/${uuid}`)
  }

  /**
   * Leave a lobby
   */
  async leave({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const result = await this.leaveLobbyUseCase.execute({
      lobbyUuid: uuid,
      playerUuid: user.uuid,
    })

    if (result.isFailure) {
      return response.status(400).json({
        error: result.error,
      })
    }

    return response.redirect('/lobbies')
  }

  /**
   * Start a game from lobby
   */
  async start({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const result = await this.startGameUseCase.execute({
      lobbyUuid: uuid,
      initiatedBy: user.uuid,
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

    const lobby = await this.lobbyRepository.findByUuid(uuid)
    if (!lobby) {
      return response.status(404).json({
        error: 'Lobby not found',
      })
    }

    return response.json({
      lobby: lobby.serialize(),
    })
  }

  /**
   * API endpoint to get all lobbies
   */
  async apiIndex({ response }: HttpContext) {
    const lobbies = await this.lobbyRepository.findAll()

    return response.json({
      lobbies: lobbies.map((lobby) => lobby.serialize()),
    })
  }
}
