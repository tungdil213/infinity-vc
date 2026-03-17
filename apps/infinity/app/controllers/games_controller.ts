import { type HttpContext } from '@adonisjs/core/http'
import { gameEngineService } from '#application/services/game_engine_service'
import {
  executeParsedGameAction,
  getAuthorizedGameSession,
  parseGameActionInput,
  type RawGameActionInput,
} from '#controllers/support/game_controller_guard'
import {
  toActionResponsePayload,
  toGameActionsPayload,
  toGameApiPayload,
  toGamePagePayload,
  toPublicPlayersPayload,
} from '#presenters/game_presenter'

export default class GamesController {
  /**
   * Display specific game (Inertia page)
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = getAuthorizedGameSession(uuid, user.userUuid, (gameUuid) =>
      gameEngineService.getSession(gameUuid)
    )
    if (!session) {
      return inertia.render('errors/not_found', {
        error: { message: 'Game not found' },
      })
    }

    const playerView = gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = gameEngineService.getAvailableActions(uuid, user.userUuid)

    return inertia.render(
      'game',
      toGamePagePayload({
        session,
        playerView,
        availableActions,
        user: { uuid: user.userUuid, nickName: user.fullName ?? user.email },
      }) as any
    )
  }

  /**
   * Get game state (API endpoint)
   */
  async apiShow({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = getAuthorizedGameSession(uuid, user.userUuid, (gameUuid) =>
      gameEngineService.getSession(gameUuid)
    )
    if (!session) {
      return response.status(404).json({ error: 'Game not found or finished' })
    }

    const playerView = gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(toGameApiPayload({ session, playerView, availableActions }))
  }

  /**
   * Get available actions for current player
   */
  async getActions({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = getAuthorizedGameSession(uuid, user.userUuid, (gameUuid) =>
      gameEngineService.getSession(gameUuid)
    )
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    const availableActions = gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(
      toGameActionsPayload({
        session,
        availableActions,
        currentUserUuid: user.userUuid,
      })
    )
  }

  /**
   * Execute a game action (draw card, play card)
   */
  async action({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const body = request.only([
      'action',
      'actionType',
      'cardType',
      'targetPlayerId',
      'guessedCard',
      'move',
      'payload',
    ]) as RawGameActionInput

    const session = getAuthorizedGameSession(uuid, user.userUuid, (gameUuid) =>
      gameEngineService.getSession(gameUuid)
    )
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    const parsedAction = parseGameActionInput(body)
    if (!parsedAction.ok) {
      return response.status(400).json({ error: parsedAction.error })
    }

    const result = executeParsedGameAction(uuid, user.userUuid, parsedAction.value, {
      drawCard: (gameUuid, userUuid) => gameEngineService.drawCard(gameUuid, userUuid),
      playCard: (gameUuid, userUuid, cardType, targetPlayerId, guessedCard) =>
        gameEngineService.playCard(gameUuid, userUuid, cardType, targetPlayerId, guessedCard),
      executeAction: (engineAction) => gameEngineService.executeAction(engineAction),
    })

    if (!result.success) {
      return response.status(400).json({ error: result.error })
    }

    const playerView = gameEngineService.getPlayerView(uuid, user.userUuid)
    const availableActions = gameEngineService.getAvailableActions(uuid, user.userUuid)

    return response.json(
      toActionResponsePayload({
        actionResult: result,
        playerView,
        availableActions,
      })
    )
  }

  /**
   * Get all players' public state (for spectators or between turns)
   */
  async getPlayers({ params, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    const session = getAuthorizedGameSession(uuid, user.userUuid, (gameUuid) =>
      gameEngineService.getSession(gameUuid)
    )
    if (!session) {
      return response.status(404).json({ error: 'Game not found' })
    }

    return response.json(toPublicPlayersPayload({ session, currentUserUuid: user.userUuid }))
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
