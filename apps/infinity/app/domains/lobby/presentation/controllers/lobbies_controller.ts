import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateLobbyHandler } from '../../application/commands/create_lobby/create_lobby.handler.js'
import { CreateLobbyCommand } from '../../application/commands/create_lobby/create_lobby.command.js'
import { JoinLobbyHandler } from '../../application/commands/join_lobby/join_lobby.handler.js'
import { JoinLobbyCommand } from '../../application/commands/join_lobby/join_lobby.command.js'
import { LeaveLobbyHandler } from '../../application/commands/leave_lobby/leave_lobby.handler.js'
import { LeaveLobbyCommand } from '../../application/commands/leave_lobby/leave_lobby.command.js'
import { StartGameHandler } from '../../application/commands/start_game/start_game.handler.js'
import { StartGameCommand } from '../../application/commands/start_game/start_game.command.js'
import { KickPlayerHandler } from '../../application/commands/kick_player/kick_player.handler.js'
import { KickPlayerCommand } from '../../application/commands/kick_player/kick_player.command.js'
import { ListLobbiesHandler } from '../../application/queries/list_lobbies/list_lobbies.handler.js'
import { ListLobbiesQuery } from '../../application/queries/list_lobbies/list_lobbies.query.js'
import { LobbyRepositoryLucid } from '../../infrastructure/persistence/lobby_repository.lucid.js'
import { EventBusService } from '#shared_kernel/infrastructure/event_bus.service'
import { createContextLogger } from '#infrastructure/logging/logger'
import { LobbySettings } from '../../domain/value_objects/lobby_settings.vo.js'

/**
 * Lobby Domain - Lobbies Controller
 * Handles all lobby operations using DDD handlers
 */
@inject()
export default class LobbiesController {
  private logger = createContextLogger('Lobby.LobbiesController')

  constructor(
    private lobbyRepository: LobbyRepositoryLucid,
    private eventBus: EventBusService
  ) {}

  /**
   * Display welcome page
   */
  async welcome({ inertia, auth }: HttpContext) {
    const user = auth.user

    // TODO: Get current lobby for user
    const currentLobby = null

    return inertia.render('welcome', {
      user: user
        ? {
            uuid: user.userUuid,
            fullName: user.fullName,
            email: user.email,
          }
        : null,
      currentLobby,
    })
  }

  /**
   * Display lobbies index page with DDD Query
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!

    try {
      // Use DDD Query Handler
      const handler = new ListLobbiesHandler(this.lobbyRepository)
      const query = new ListLobbiesQuery(false) // Get all lobbies

      const result = await handler.handle(query)

      if (result.isFailure) {
        this.logger.error({ error: result.error }, 'Failed to list lobbies')
        return inertia.render('lobbies/index', {
          lobbies: [],
          currentLobby: null,
        })
      }

      const aggregates = result.value

      // Transform aggregates to DTOs
      const lobbies = aggregates.map((aggregate) => ({
        uuid: aggregate.lobbyEntity.id,
        name: aggregate.lobbyEntity.settings.name,
        maxPlayers: aggregate.lobbyEntity.settings.maxPlayers,
        currentPlayers: aggregate.playersList.length,
        isPrivate: aggregate.lobbyEntity.settings.isPrivate,
        status: aggregate.lobbyEntity.status,
        gameType: aggregate.lobbyEntity.settings.gameType,
        players: aggregate.playersList.map((player) => ({
          uuid: player.id,
          userId: player.userId,
          username: player.username,
          isReady: player.isReady,
          isOwner: player.isOwner,
        })),
      }))

      // TODO: Get current lobby for user
      const currentLobby = null

      return inertia.render('lobbies/index', {
        lobbies,
        currentLobby,
      })
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error listing lobbies')
      return inertia.render('lobbies/index', {
        lobbies: [],
        currentLobby: null,
      })
    }
  }

  /**
   * Show create lobby form
   */
  async showCreateForm({ inertia, auth }: HttpContext) {
    const user = auth.user!
    return inertia.render('lobbies/create', {
      user: {
        uuid: user.userUuid,
        fullName: user.fullName || user.username,
      },
    })
  }

  /**
   * Show a specific lobby
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const lobbyId = params.uuid

    try {
      // Fetch lobby from repository
      const result = await this.lobbyRepository.findById(lobbyId)

      if (result.isFailure || !result.value) {
        this.logger.warn({ lobbyId }, 'Lobby not found')
        return inertia.render('errors/not_found', {
          message: 'Lobby not found',
        })
      }

      const lobbyAggregate = result.value
      const lobby = lobbyAggregate.lobbyEntity
      const players = lobbyAggregate.playersList

      // Transform for frontend
      const lobbyData = {
        uuid: lobby.id,
        name: lobby.settings.name,
        status: lobby.status,
        currentPlayers: players.length,
        maxPlayers: lobby.settings.maxPlayers,
        minPlayers: lobby.settings.minPlayers,
        isPrivate: lobby.settings.isPrivate,
        hasAvailableSlots: players.length < lobby.settings.maxPlayers,
        canStart: players.length >= lobby.settings.minPlayers,
        createdBy: lobby.ownerId,
        creator: {
          uuid: lobby.ownerId,
          nickName: 'Creator', // TODO: Get from user
        },
        players: players.map((p) => ({
          uuid: p.userId,
          nickName: p.username,
        })),
        availableActions: [], // TODO: Implement permissions
        createdAt: lobby.createdAt.toISOString(),
        invitationCode: lobby.invitationCode || '',
        hasPassword: false, // TODO: Implement when password is added
      }

      return inertia.render('lobbies/show', {
        lobby: lobbyData,
        user: {
          uuid: user.userUuid,
          nickName: user.fullName || user.username,
        },
      })
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Error fetching lobby')
      return inertia.render('errors/server_error', {
        message: 'Failed to load lobby',
      })
    }
  }

  /**
   * Show a specific lobby (API - returns JSON)
   */
  async showApi({ params, response }: HttpContext) {
    const lobbyId = params.uuid

    try {
      // Fetch lobby from repository
      const result = await this.lobbyRepository.findById(lobbyId)

      if (result.isFailure || !result.value) {
        this.logger.warn({ lobbyId }, 'Lobby not found (API)')
        return response.notFound({ error: 'Lobby not found' })
      }

      const lobbyAggregate = result.value
      const lobby = lobbyAggregate.lobbyEntity
      const players = lobbyAggregate.playersList

      // Return JSON
      return response.ok({
        uuid: lobby.id,
        name: lobby.settings.name,
        status: lobby.status,
        currentPlayers: players.length,
        maxPlayers: lobby.settings.maxPlayers,
        minPlayers: lobby.settings.minPlayers,
        isPrivate: lobby.settings.isPrivate,
        hasAvailableSlots: players.length < lobby.settings.maxPlayers,
        canStart: players.length >= lobby.settings.minPlayers,
        createdBy: lobby.ownerId,
        creator: {
          uuid: lobby.ownerId,
          nickName: 'Creator', // TODO: Get from user
        },
        players: players.map((p) => ({
          uuid: p.userId,
          nickName: p.username,
        })),
        availableActions: [], // TODO: Implement permissions
        createdAt: lobby.createdAt.toISOString(),
        invitationCode: lobby.invitationCode || '',
        hasPassword: false, // TODO: Implement when password is added
      })
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Error fetching lobby (API)')
      return response.internalServerError({ error: 'Failed to load lobby' })
    }
  }

  /**
   * Create lobby using DDD Command
   */
  async store({ request, response, auth, session }: HttpContext) {
    const user = auth.user!

    try {
      const { name, maxPlayers, minPlayers, isPrivate, gameType } = request.only([
        'name',
        'maxPlayers',
        'minPlayers',
        'isPrivate',
        'gameType',
      ])

      // Use DDD Command Handler
      const handler = new CreateLobbyHandler(this.lobbyRepository, this.eventBus)
      const command = new CreateLobbyCommand(
        user.userUuid,
        user.fullName || user.username,
        name,
        Number.parseInt(maxPlayers) || 4,
        Number.parseInt(minPlayers) || 2,
        isPrivate === 'true' || isPrivate === true,
        gameType || 'tic-tac-toe'
      )

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error }, 'Failed to create lobby')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      const aggregate = result.value

      session.flash('success', `Lobby "${aggregate.lobbyEntity.settings.name}" created!`)
      this.logger.info({ lobbyId: aggregate.lobbyEntity.id }, 'Lobby created successfully')

      return response.redirect(`/lobbies/${aggregate.lobbyEntity.id}`)
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error creating lobby')
      session.flash('error', 'Failed to create lobby')
      return response.redirect().back()
    }
  }

  /**
   * Join lobby using DDD Command
   */
  async join({ params, auth, response, session }: HttpContext) {
    const user = auth.user!
    const lobbyId = params.uuid

    try {
      // Use DDD Command Handler
      const handler = new JoinLobbyHandler(this.lobbyRepository, this.eventBus)
      const command = new JoinLobbyCommand(
        lobbyId,
        user.userUuid,
        user.fullName || user.username || 'Player'
      )

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error, lobbyId }, 'Failed to join lobby')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Joined lobby successfully!')
      this.logger.info({ lobbyId, userId: user.userUuid }, 'User joined lobby')

      return response.redirect(`/lobbies/${lobbyId}`)
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Unexpected error joining lobby')
      session.flash('error', 'Failed to join lobby')
      return response.redirect().back()
    }
  }

  /**
   * Leave lobby using DDD Command
   */
  async leave({ params, auth, response, session }: HttpContext) {
    const user = auth.user!
    const lobbyId = params.uuid

    try {
      // Use DDD Command Handler
      const handler = new LeaveLobbyHandler(this.lobbyRepository, this.eventBus)
      const command = new LeaveLobbyCommand(lobbyId, user.userUuid)

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error, lobbyId }, 'Failed to leave lobby')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Left lobby successfully!')
      this.logger.info({ lobbyId, userId: user.userUuid }, 'User left lobby')

      return response.redirect('/lobbies')
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Unexpected error leaving lobby')
      session.flash('error', 'Failed to leave lobby')
      return response.redirect().back()
    }
  }

  /**
   * Start game using DDD Command
   */
  async startGame({ params, auth, response, session }: HttpContext) {
    const user = auth.user!
    const lobbyId = params.uuid

    try {
      // Generate game ID (or get from request)
      const gameId = crypto.randomUUID()

      // Use DDD Command Handler
      const handler = new StartGameHandler(this.lobbyRepository, this.eventBus)
      const command = new StartGameCommand(lobbyId, user.userUuid, gameId)

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error, lobbyId }, 'Failed to start game')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Game started!')
      this.logger.info({ lobbyId, gameId }, 'Game started successfully')

      return response.redirect(`/games/${gameId}`)
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Unexpected error starting game')
      session.flash('error', 'Failed to start game')
      return response.redirect().back()
    }
  }

  /**
   * Kick player from lobby
   */
  async kickPlayer({ params, auth, request, response, session }: HttpContext) {
    const user = auth.user!
    const lobbyId = params.uuid
    const targetUserId = request.input('userId')

    if (!targetUserId) {
      session.flash('error', 'Target user ID is required')
      return response.redirect().back()
    }

    try {
      const handler = new KickPlayerHandler(this.lobbyRepository, this.eventBus)
      const command = new KickPlayerCommand(lobbyId, user.userUuid, targetUserId)

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error, lobbyId, targetUserId }, 'Failed to kick player')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Player kicked successfully')
      this.logger.info({ lobbyId, kickerId: user.userUuid, targetUserId }, 'Player kicked')

      return response.redirect(`/lobbies/${lobbyId}`)
    } catch (error) {
      this.logger.error({ error, lobbyId }, 'Unexpected error kicking player')
      session.flash('error', 'Failed to kick player')
      return response.redirect().back()
    }
  }

  /**
   * Show join by invitation code form
   */
  async showJoinByInvite({ params, inertia, auth }: HttpContext) {
    const invitationCode = params.invitationCode
    const user = auth.user

    try {
      // Find lobby by invitation code
      const result = await this.lobbyRepository.findByInvitationCode(invitationCode)

      if (result.isFailure || !result.value) {
        this.logger.warn({ invitationCode }, 'Invalid invitation code')
        return inertia.render('errors/not_found', {
          message: 'Invalid invitation code or lobby not found',
        })
      }

      const lobbyAggregate = result.value
      const lobby = lobbyAggregate.lobbyEntity
      const players = lobbyAggregate.playersList

      // Transform for frontend
      const lobbyData = {
        uuid: lobby.id,
        name: lobby.settings.name,
        status: lobby.status,
        currentPlayers: players.length,
        maxPlayers: lobby.settings.maxPlayers,
        minPlayers: lobby.settings.minPlayers,
        isPrivate: lobby.settings.isPrivate,
        hasAvailableSlots: players.length < lobby.settings.maxPlayers,
        invitationCode: lobby.invitationCode || '',
      }

      return inertia.render('lobbies/join', {
        lobby: lobbyData,
        user: user
          ? {
              uuid: user.userUuid,
              nickName: user.fullName || user.username,
            }
          : null,
      })
    } catch (error) {
      this.logger.error({ error, invitationCode }, 'Error showing invitation page')
      return inertia.render('errors/500', {
        message: 'An error occurred while loading the lobby',
      })
    }
  }

  /**
   * Join lobby by invitation code
   */
  async joinByInvite({ params, auth, response, session }: HttpContext) {
    const user = auth.user!
    const invitationCode = params.invitationCode

    try {
      // Find lobby by invitation code
      const findResult = await this.lobbyRepository.findByInvitationCode(invitationCode)

      if (findResult.isFailure || !findResult.value) {
        this.logger.warn({ invitationCode }, 'Invalid invitation code')
        session.flash('error', 'Invalid invitation code or lobby not found')
        return response.redirect().back()
      }

      const lobby = findResult.value.lobbyEntity

      // Use join handler
      const handler = new JoinLobbyHandler(this.lobbyRepository, this.eventBus)
      const command = new JoinLobbyCommand(
        lobby.id,
        user.userUuid,
        user.fullName || user.username || 'Player'
      )

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error, invitationCode }, 'Failed to join via invite')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      session.flash('success', 'Joined lobby successfully!')
      this.logger.info(
        { lobbyId: lobby.id, userId: user.userUuid, invitationCode },
        'User joined via invitation'
      )

      return response.redirect(`/lobbies/${lobby.id}`)
    } catch (error) {
      this.logger.error({ error, invitationCode }, 'Unexpected error joining via invite')
      session.flash('error', 'Failed to join lobby')
      return response.redirect().back()
    }
  }
}
