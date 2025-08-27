import type { HttpContext } from '@adonisjs/core/http'
import { CreateLobbyUseCase } from '../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../application/use_cases/leave_lobby_use_case.js'
import { ListLobbiesUseCase } from '../application/use_cases/list_lobbies_use_case.js'
import { StartGameUseCase } from '../application/use_cases/start_game_use_case.js'
import { HybridLobbyService } from '../application/services/hybrid_lobby_service.js'

export default class LobbyController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private listLobbiesUseCase: ListLobbiesUseCase,
    private startGameUseCase: StartGameUseCase,
    private hybridLobbyService: HybridLobbyService
  ) {}

  /**
   * GET /lobbies
   * List available lobbies
   */
  async index({ request, response }: HttpContext) {
    try {
      const { status, hasSlots, includePrivate } = request.qs()

      const result = await this.listLobbiesUseCase.execute({
        status,
        hasSlots: hasSlots === 'true',
        includePrivate: includePrivate === 'true',
      })

      return response.status(200).json({
        success: true,
        message: 'Lobbies retrieved successfully',
        data: result.lobbies,
        meta: {
          total: result.total,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to retrieve lobbies',
        errors: [error.message],
      })
    }
  }

  /**
   * POST /lobbies
   * Create a new lobby
   */
  async create({ request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const data = request.only(['name', 'maxPlayers', 'isPrivate'])

      const result = await this.createLobbyUseCase.execute({
        userUuid,
        ...data,
      })

      return response.status(201).json({
        success: true,
        message: 'Lobby created successfully',
        data: result,
      })
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      })
    }
  }

  /**
   * GET /lobbies/:lobbyId
   * Get lobby details
   */
  async show({ params, response }: HttpContext) {
    try {
      const lobby = await this.hybridLobbyService.findByUuidOrFail(params.lobbyId)

      return response.status(200).json({
        success: true,
        message: 'Lobby retrieved successfully',
        lobby: lobby.toJSON(),
      })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Lobby not found',
        errors: [error.message],
      })
    }
  }

  /**
   * POST /lobbies/:lobbyId/join
   * Join a lobby
   */
  async join({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const result = await this.joinLobbyUseCase.execute({
        userUuid,
        lobbyUuid: params.lobbyId,
      })

      return response.status(200).json({
        success: true,
        message: 'Successfully joined lobby',
        data: result,
      })
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400
      return response.status(statusCode).json({
        success: false,
        message: error.message,
        errors: [error.message],
      })
    }
  }

  /**
   * POST /lobbies/:lobbyId/leave
   * Leave a lobby
   */
  async leave({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const result = await this.leaveLobbyUseCase.execute({
        userUuid,
        lobbyUuid: params.lobbyId,
      })

      return response.status(200).json({
        success: true,
        message: result.message,
        data: {
          lobbyDeleted: result.lobbyDeleted,
        },
      })
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400
      return response.status(statusCode).json({
        success: false,
        message: error.message,
        errors: [error.message],
      })
    }
  }

  /**
   * POST /lobbies/:lobbyId/start
   * Start a game from lobby
   */
  async start({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const result = await this.startGameUseCase.execute({
        userUuid,
        lobbyUuid: params.lobbyId,
      })

      return response.status(201).json({
        success: true,
        message: 'Game started successfully',
        data: result,
        redirectUrl: `/games/${result.game.uuid}`,
      })
    } catch (error) {
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('Only lobby creator')
          ? 403
          : 400
      return response.status(statusCode).json({
        success: false,
        message: error.message,
        errors: [error.message],
      })
    }
  }
}
