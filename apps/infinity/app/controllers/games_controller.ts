import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import * as GameRepo from '../application/repositories/game_repository.js'
import { gameEngineService } from '../application/services/game_engine_service.js'
import { Cards } from '../games/love-letter/types.js'

@inject()
export default class GamesController {
  constructor(private gameRepository: GameRepo.GameRepository) {}

  /**
   * Display specific game (Inertia page)
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    // Get game session from engine
    const session = gameEngineService.getSession(uuid)
    if (!session) {
      // Try to find in database (game might have finished)
      const game = await this.gameRepository.findByUuid(uuid)
      if (!game) {
        return inertia.render('errors/not_found', {
          error: { message: 'Game not found' },
        })
      }

      return inertia.render('game', {
        game: game.toJSON(),
        user: { uuid: user.uuid, nickName: user.fullName },
        isFinished: true,
      })
    }

    // Check if user is part of this game
    const isPlayerInGame = session.state.players.some((p) => p.id === user.uuid)
    if (!isPlayerInGame) {
      return inertia.render('errors/not_found', {
        error: { message: 'You are not part of this game' },
      })
    }

    // Get player-specific view (hides other players' hands)
    const playerView = gameEngineService.getPlayerView(uuid, user.uuid)

    return inertia.render('game', {
      gameId: session.gameId,
      playerView,
      availableActions: gameEngineService.getAvailableActions(uuid, user.uuid),
      user: { uuid: user.uuid, nickName: user.fullName },
      isFinished: session.state.isFinished,
    })
  }

  /**
   * Get game state (API endpoint)
   */
  async apiShow({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = gameEngineService.getSession(uuid)
    if (!session) {
      return response.status(404).json({ error: 'Game not found or finished' })
    }

    // Check if user is part of this game
    const isPlayerInGame = session.state.players.some((p) => p.id === user.uuid)
    if (!isPlayerInGame) {
      return response.status(403).json({ error: 'You are not part of this game' })
    }

    // Get player-specific view
    const playerView = gameEngineService.getPlayerView(uuid, user.uuid)

    return response.json({
      gameId: session.gameId,
      playerView,
      availableActions: gameEngineService.getAvailableActions(uuid, user.uuid),
      isFinished: session.state.isFinished,
    })
  }

  /**
   * Get available actions for current player
   */
  async getActions({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = gameEngineService.getSession(uuid)
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    const availableActions = gameEngineService.getAvailableActions(uuid, user.uuid)
    const isMyTurn = session.state.currentPlayerId === user.uuid

    return response.json({
      availableActions,
      isMyTurn,
      phase: session.state.phase,
    })
  }

  /**
   * Execute a game action (draw card, play card)
   */
  async action({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const body = request.only(['action', 'cardType', 'targetPlayerId', 'guessedCard'])

    const session = gameEngineService.getSession(uuid)
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    // Check if user is part of this game
    const isPlayerInGame = session.state.players.some((p) => p.id === user.uuid)
    if (!isPlayerInGame) {
      return response.status(403).json({ error: 'You are not part of this game' })
    }

    let result

    switch (body.action) {
      case 'draw':
        result = gameEngineService.drawCard(uuid, user.uuid)
        break

      case 'play':
        if (!body.cardType) {
          return response.status(400).json({ error: 'cardType is required' })
        }
        result = gameEngineService.playCard(
          uuid,
          user.uuid,
          body.cardType,
          body.targetPlayerId,
          body.guessedCard
        )
        break

      default:
        return response.status(400).json({ error: `Unknown action: ${body.action}` })
    }

    if (!result.success) {
      return response.status(400).json({ error: result.error })
    }

    // Get updated player view
    const playerView = gameEngineService.getPlayerView(uuid, user.uuid)

    return response.json({
      success: true,
      playerView,
      availableActions: gameEngineService.getAvailableActions(uuid, user.uuid),
      events: result.events,
      isFinished: result.newState?.isFinished ?? false,
      winnerId: result.newState?.winnerId,
    })
  }

  /**
   * Get all players' public state (for spectators or between turns)
   */
  async getPlayers({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = gameEngineService.getSession(uuid)
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    // Return public player information
    const players = session.state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      isEliminated: p.isEliminated,
      isProtected: p.isProtected,
      handCount: p.hand.length,
      discardPile: p.discardPile.map((cardType) => ({
        type: cardType,
        name: Cards[cardType].name,
        value: Cards[cardType].value,
      })),
      tokensOfAffection: p.tokensOfAffection,
      isCurrentPlayer: p.id === session.state.currentPlayerId,
      isMe: p.id === user.uuid,
    }))

    return response.json({
      players,
      currentPlayerId: session.state.currentPlayerId,
      phase: session.state.phase,
      round: session.state.round,
      deckCount: session.state.deck.length,
    })
  }

  /**
   * Leave/forfeit game
   */
  async leave({ params, response }: HttpContext) {
    const { uuid } = params

    const session = gameEngineService.getSession(uuid)
    if (!session) {
      return response.redirect('/lobbies')
    }

    // TODO: Handle player forfeiting (eliminate them)
    // For now, just redirect
    return response.redirect('/lobbies')
  }
}
