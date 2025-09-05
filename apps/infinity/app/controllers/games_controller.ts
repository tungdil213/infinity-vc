import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GameRepository } from '../domain/repositories/game_repository.js'
import { UserRepository } from '../domain/repositories/user_repository.js'

@inject()
export default class GamesController {
  constructor(
    private gameRepository: GameRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Display specific game
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const game = await this.gameRepository.findByUuid(uuid)
    if (!game) {
      return inertia.render('errors/not_found', {
        error: { message: 'Game not found' },
      })
    }

    // Check if user is part of this game
    const isPlayerInGame = game.players.some((p) => p.uuid === user.uuid)
    if (!isPlayerInGame) {
      return inertia.render('errors/not_found', {
        error: { message: 'You are not part of this game' },
      })
    }

    return inertia.render('game', {
      game: game.serialize(),
      user: {
        uuid: user.uuid,
        nickName: user.fullName,
      },
    })
  }

  /**
   * Handle game actions (API endpoint)
   */
  async action({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { action, data } = request.only(['action', 'data'])

    const game = await this.gameRepository.findByUuid(uuid)
    if (!game) {
      return response.status(404).json({
        error: 'Game not found',
      })
    }

    // Check if user is part of this game
    const isPlayerInGame = game.players.some((p) => p.uuid === user.uuid)
    if (!isPlayerInGame) {
      return response.status(403).json({
        error: 'You are not part of this game',
      })
    }

    // Handle different game actions
    try {
      let result

      switch (action) {
        case 'sample_action':
          // Placeholder for game-specific actions
          result = await this.handleSampleAction(game, user.uuid, data)
          break

        case 'end_turn':
          result = await this.handleEndTurn(game, user.uuid)
          break

        default:
          return response.status(400).json({
            error: `Unknown action: ${action}`,
          })
      }

      if (result.isFailure) {
        return response.status(400).json({
          error: result.error,
        })
      }

      return response.json({
        success: true,
        data: result.value,
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * Get game state (API endpoint)
   */
  async apiShow({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const game = await this.gameRepository.findByUuid(uuid)
    if (!game) {
      return response.status(404).json({
        error: 'Game not found',
      })
    }

    // Check if user is part of this game
    const isPlayerInGame = game.players.some((p) => p.uuid === user.uuid)
    if (!isPlayerInGame) {
      return response.status(403).json({
        error: 'You are not part of this game',
      })
    }

    return response.json({
      game: game.serialize(),
    })
  }

  /**
   * Leave game
   */
  async leave({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const game = await this.gameRepository.findByUuid(uuid)
    if (!game) {
      return response.status(404).json({
        error: 'Game not found',
      })
    }

    // Handle player leaving game
    // This would typically update game state and notify other players
    // For now, just redirect to lobbies
    return response.redirect('/lobbies')
  }

  /**
   * Handle sample game action (placeholder)
   */
  private async handleSampleAction(game: any, playerUuid: string, data: any) {
    // Placeholder implementation
    // In a real game, this would update game state based on the action
    console.log(`Player ${playerUuid} performed sample action in game ${game.uuid}:`, data)

    return {
      isFailure: false,
      value: {
        message: 'Sample action performed successfully',
        gameState: game.serialize(),
      },
    }
  }

  /**
   * Handle end turn action
   */
  private async handleEndTurn(game: any, playerUuid: string) {
    // Placeholder implementation
    // In a real game, this would advance to the next player's turn
    console.log(`Player ${playerUuid} ended their turn in game ${game.uuid}`)

    return {
      isFailure: false,
      value: {
        message: 'Turn ended successfully',
        gameState: game.serialize(),
      },
    }
  }
}
