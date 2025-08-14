import type { HttpContext } from '@adonisjs/core/http'
import { GameRepository } from '../application/repositories/game_repository.js'

export default class GameController {
  constructor(private gameRepository: GameRepository) {}

  /**
   * GET /games
   * List games (for a player or all)
   */
  async index({ request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user?.uuid
      const userUuid = request.input('userUuid') // Temporary for testing
      const { status, limit } = request.qs()

      let games
      if (userUuid) {
        games = await this.gameRepository.findByPlayer(userUuid)
      } else if (status) {
        games = await this.gameRepository.findByStatus(status)
      } else {
        games = await this.gameRepository.findRecentGames(limit ? parseInt(limit) : 10)
      }

      return response.status(200).json({
        success: true,
        message: 'Games retrieved successfully',
        data: {
          games: games.map((game) => game.toJSON()),
        },
        meta: {
          total: games.length,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to retrieve games',
        errors: [error.message],
      })
    }
  }

  /**
   * GET /games/:gameId
   * Get game details
   */
  async show({ params, response, auth }: HttpContext) {
    try {
      const game = await this.gameRepository.findByUuidOrFail(params.gameId)

      // TODO: Check if user has access to this game
      // const userUuid = auth.user?.uuid
      // if (!game.hasPlayer(userUuid)) {
      //   return response.status(403).json({
      //     success: false,
      //     message: 'Access denied to this game'
      //   })
      // }

      return response.status(200).json({
        success: true,
        message: 'Game retrieved successfully',
        data: {
          game: game.toJSON(),
        },
      })
    } catch (error) {
      return response.status(404).json({
        success: false,
        message: 'Game not found',
        errors: [error.message],
      })
    }
  }

  /**
   * POST /games/:gameId/actions
   * Perform a game action
   */
  async action({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const game = await this.gameRepository.findByUuidOrFail(params.gameId)

      // Vérifier que c'est le tour du joueur
      if (!game.canPlayerPlay(userUuid)) {
        return response.status(400).json({
          success: false,
          message: 'It is not your turn or you cannot play',
        })
      }

      const { action, ...actionData } = request.all()

      // TODO: Implement game action logic
      // This would involve game rules, card playing, etc.
      // For now, just return a placeholder response

      return response.status(200).json({
        success: true,
        message: 'Action performed successfully',
        data: {
          game: game.toJSON(),
          result: {
            action,
            success: true,
            message: 'Action processed (placeholder implementation)',
          },
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
   * GET /games/:gameId/hand
   * Get player's hand
   */
  async hand({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth
      // const userUuid = auth.user!.uuid
      const userUuid = request.input('userUuid') // Temporary for testing

      const game = await this.gameRepository.findByUuidOrFail(params.gameId)

      // Vérifier que le joueur fait partie de la partie
      if (!game.hasPlayer(userUuid)) {
        return response.status(403).json({
          success: false,
          message: 'Access denied to this game',
        })
      }

      // TODO: Get player's actual hand from game data
      const playerHand = game.gameData.playerHands[userUuid] || []

      return response.status(200).json({
        success: true,
        message: 'Hand retrieved successfully',
        data: {
          hand: playerHand,
          canPlay: game.canPlayerPlay(userUuid),
          availableTargets: game.activePlayers
            .filter((p) => p.uuid !== userUuid)
            .map((p) => p.uuid),
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
   * POST /games/:gameId/pause
   * Pause a game
   */
  async pause({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth and check permissions
      const game = await this.gameRepository.findByUuidOrFail(params.gameId)

      game.pauseGame()
      await this.gameRepository.save(game)

      return response.status(200).json({
        success: true,
        message: 'Game paused successfully',
        data: {
          game: game.toJSON(),
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
   * POST /games/:gameId/resume
   * Resume a paused game
   */
  async resume({ params, request, response, auth }: HttpContext) {
    try {
      // TODO: Get user UUID from auth and check permissions
      const game = await this.gameRepository.findByUuidOrFail(params.gameId)

      game.resumeGame()
      await this.gameRepository.save(game)

      return response.status(200).json({
        success: true,
        message: 'Game resumed successfully',
        data: {
          game: game.toJSON(),
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
}
