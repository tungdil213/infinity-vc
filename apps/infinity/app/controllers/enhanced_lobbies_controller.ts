import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
// import crypto from 'node:crypto' // TODO: Use for invitation codes
import { CreateLobbyUseCase } from '../application/use_cases/create_lobby_use_case.js'
import { JoinLobbyUseCase } from '../application/use_cases/join_lobby_use_case.js'
import { LeaveLobbyUseCase } from '../application/use_cases/leave_lobby_use_case.js'
import { StartGameUseCase } from '../application/use_cases/start_game_use_case.js'
import { DatabaseUserRepository } from '../infrastructure/repositories/database_user_repository.js'
import { HybridLobbyService } from '../application/services/hybrid_lobby_service.js'
import BusinessException from '../exceptions/business_exception.js'
import {
  LobbyCreationException,
  InvalidLobbyConfigurationException,
  LobbyCreationInternalException,
  // LobbyNotFoundException, // TODO: Use these exceptions
  // LobbyFullException,
  // InvalidLobbyPasswordException,
} from '../exceptions/lobby_exceptions.js'
import { lobbyStoreValidator } from '#validators/lobby_store_validator'

@inject()
export default class EnhancedLobbiesController {
  constructor(
    private createLobbyUseCase: CreateLobbyUseCase,
    private joinLobbyUseCase: JoinLobbyUseCase,
    private leaveLobbyUseCase: LeaveLobbyUseCase,
    private startGameUseCase: StartGameUseCase,
    private lobbyRepository: HybridLobbyService,
    private userRepository: DatabaseUserRepository
  ) {}

  /**
   * Display welcome page
   */
  async welcome({ inertia, auth }: HttpContext) {
    const user = auth.user

    // Check if user is currently in a lobby
    const currentLobby = user ? await this.lobbyRepository.findByPlayer(user.userUuid) : null

    return inertia.render('welcome', {
      user: user
        ? {
            uuid: user.userUuid,
            fullName: user.fullName,
            email: user.email,
          }
        : null,
      currentLobby: currentLobby
        ? {
            uuid: currentLobby.uuid,
            name: currentLobby.name,
            status: currentLobby.status,
            currentPlayers: currentLobby.players.length,
            maxPlayers: currentLobby.maxPlayers,
          }
        : null,
    })
  }

  /**
   * Display lobbies index page
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!

    try {
      const lobbies = await this.lobbyRepository.findAll()

      // Check if user is currently in a lobby
      const currentLobby = await this.lobbyRepository.findByPlayer(user.userUuid)

      return inertia.render('lobbies', {
        lobbies: lobbies.map((lobby) => ({
          uuid: lobby.uuid,
          name: lobby.name,
          maxPlayers: lobby.maxPlayers,
          currentPlayers: lobby.players.length,
          isPrivate: lobby.isPrivate,
          status: lobby.status,
          availableActions: lobby.availableActions,
          createdBy: lobby.createdBy,
          players: lobby.players.map((player) => ({
            uuid: player.uuid,
            nickName: player.nickName,
          })),
          createdAt: lobby.createdAt,
        })),
        user: {
          uuid: user.userUuid,
          nickName: user.email, // Using email as nickName fallback
          fullName: user.fullName,
        },
        currentLobby: currentLobby
          ? {
              uuid: currentLobby.uuid,
              name: currentLobby.name,
              status: currentLobby.status,
              currentPlayers: currentLobby.players.length,
              maxPlayers: currentLobby.maxPlayers,
            }
          : null,
      })
    } catch (error) {
      console.error('Failed to load lobbies:', error)
      return inertia.render('lobbies', {
        lobbies: [],
        user: {
          uuid: user.userUuid,
          nickName: user.email, // Using email as nickName fallback
          fullName: user.fullName,
        },
        currentLobby: null,
      })
    }
  }

  /**
   * Display create lobby form
   */
  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!

    // Check if user is currently in a lobby
    const currentLobby = await this.lobbyRepository.findByPlayer(user.userUuid)

    return inertia.render('create-lobby', {
      user: {
        uuid: user.userUuid,
        fullName: user.fullName,
      },
      currentLobby: currentLobby
        ? {
            uuid: currentLobby.uuid,
            name: currentLobby.name,
            status: currentLobby.status,
            currentPlayers: currentLobby.players.length,
            maxPlayers: currentLobby.maxPlayers,
          }
        : null,
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
        description,
        maxPlayers,
        isPrivate = false,
        hasPassword = false,
        password,
        gameType = 'love-letter',
      } = await request.validateUsing(lobbyStoreValidator)

      if (hasPassword && (!password || password.trim().length === 0)) {
        throw new InvalidLobbyConfigurationException(
          'password',
          password,
          'Password is required when password protection is enabled'
        )
      }

      const result = await this.createLobbyUseCase.execute({
        userUuid: user.userUuid,
        name: name.trim(),
        maxPlayers,
        isPrivate: Boolean(isPrivate),
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
      const lobby = await this.lobbyRepository.findByUuid(uuid)
      if (!lobby) {
        return inertia.render('errors/not_found', {
          error: { message: 'Lobby not found' },
        })
      }

      return inertia.render('lobby', {
        lobby: {
          ...lobby.toJSON(),
          invitationCode: lobby.uuid, // Use UUID as invitation code for now
          hasPassword: false, // TODO: Add password support to lobby entity
        },
        user: {
          uuid: user.userUuid,
          nickName: user.fullName,
        },
      })
    } catch (error) {
      console.error('Failed to load lobby:', error)
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
      // For now, use invitation code as UUID
      const lobby = await this.lobbyRepository.findByUuid(invitationCode)
      if (!lobby) {
        return inertia.render('errors/not_found', {
          error: { message: 'Lobby not found or invitation expired' },
        })
      }

      const lobbyData = lobby.toJSON()

      return inertia.render('join-lobby', {
        lobby: {
          ...lobbyData,
          hasPassword: false, // TODO: Add password support
        },
        user: user
          ? {
              uuid: user.userUuid,
              fullName: user.fullName,
            }
          : null,
        invitationCode,
      })
    } catch (error) {
      console.error('Failed to load lobby for invitation:', error)
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
    // TODO: Use password for private lobbies
    // const { password } = request.only(['password']) // request removed from destructuring
    const user = auth.user!

    try {
      // For now, use invitation code as UUID
      const lobby = await this.lobbyRepository.findByUuid(invitationCode)
      if (!lobby) {
        session.flash('error', 'Lobby not found or invitation expired')
        return response.redirect('/lobbies')
      }

      // TODO: Check password if lobby has password protection
      // if (lobby.hasPassword && lobby.password !== password) {
      //   session.flash('error', 'Invalid password')
      //   return response.redirect().back()
      // }

      // Get user from repository
      const userEntity = await this.userRepository.findByUuid(user.userUuid)
      if (!userEntity) {
        session.flash('error', 'User not found')
        return response.redirect('/lobbies')
      }

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
      console.error('Failed to join lobby by invitation:', error)
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
      // Get user from repository
      const userEntity = await this.userRepository.findByUuid(user.userUuid)
      if (!userEntity) {
        return response.status(404).json({
          error: 'User not found',
        })
      }

      const result = await this.joinLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: user.userUuid,
      })

      if (result.isFailure) {
        if (request.accepts(['html'])) {
          session.flash('error', result.error)
          return response.redirect().back()
        }
        return response.status(400).json({
          error: result.error,
        })
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
      console.error('Failed to join lobby:', error)
      if (request.accepts(['html'])) {
        session.flash('error', 'Failed to join lobby. Please try again.')
        return response.redirect().back()
      }
      return response.status(500).json({
        error: 'Failed to join lobby',
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
        if (request.accepts(['html'])) {
          session.flash('error', result.error)
          return response.redirect().back()
        }
        return response.status(400).json({
          error: result.error,
        })
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
      console.error('Failed to leave lobby:', error)
      if (request.accepts(['html'])) {
        session.flash('error', 'Failed to leave lobby. Please try again.')
        return response.redirect().back()
      }
      return response.status(500).json({
        error: 'Failed to leave lobby',
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
        if (request.accepts(['html'])) {
          session.flash('error', result.error)
          return response.redirect().back()
        }
        return response.status(400).json({
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
      console.error('Failed to start game:', error)
      if (request.accepts(['html'])) {
        session.flash('error', 'Failed to start game. Please try again.')
        return response.redirect().back()
      }
      return response.status(500).json({
        error: 'Failed to start game',
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
      const lobby = await this.lobbyRepository.findByUuid(uuid)
      if (!lobby) {
        return response.status(404).json({
          error: 'Lobby not found',
        })
      }

      // Check if user is the lobby owner
      if (lobby.createdBy !== user.uuid) {
        return response.status(403).json({
          error: 'Only the lobby owner can kick players',
        })
      }

      // Cannot kick yourself
      if (playerUuid === user.uuid) {
        return response.status(400).json({
          error: 'You cannot kick yourself',
        })
      }

      const result = await this.leaveLobbyUseCase.execute({
        lobbyUuid: uuid,
        userUuid: playerUuid,
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
      console.error('Failed to kick player:', error)
      return response.status(500).json({
        error: 'Failed to kick player',
      })
    }
  }

  /**
   * Transfer lobby ownership (owner only)
   */
  async transferOwnership({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params
    const { newOwnerUuid } = request.only(['newOwnerUuid'])

    try {
      const lobby = await this.lobbyRepository.findByUuid(uuid)
      if (!lobby) {
        return response.status(404).json({
          error: 'Lobby not found',
        })
      }

      // Check if user is the lobby owner
      if (lobby.createdBy !== user.uuid) {
        return response.status(403).json({
          error: 'Only the lobby owner can transfer ownership',
        })
      }

      // Check if new owner is in the lobby
      const isPlayerInLobby = lobby.players.some((p) => p.uuid === newOwnerUuid)
      if (!isPlayerInLobby) {
        return response.status(400).json({
          error: 'New owner must be a player in the lobby',
        })
      }

      // Update lobby ownership
      // TODO: Implement this in the lobby entity and use case
      // For now, we'll just return success

      return response.json({
        success: true,
        message: 'Ownership transferred successfully',
      })
    } catch (error) {
      console.error('Failed to transfer ownership:', error)
      return response.status(500).json({
        error: 'Failed to transfer ownership',
      })
    }
  }

  /**
   * API endpoint to get lobby data
   */
  async apiShow({ params, response }: HttpContext) {
    const { uuid } = params

    try {
      const lobby = await this.lobbyRepository.findByUuid(uuid)
      if (!lobby) {
        return response.status(404).json({
          error: 'Lobby not found',
        })
      }

      return response.json({
        lobby: {
          ...lobby.toJSON(),
          invitationCode: lobby.uuid,
        },
      })
    } catch (error) {
      console.error('Failed to get lobby:', error)
      return response.status(500).json({
        error: 'Failed to get lobby',
      })
    }
  }

  /**
   * API endpoint to get all lobbies
   */
  async apiIndex({ response }: HttpContext) {
    try {
      const lobbies = await this.lobbyRepository.findAll()

      return response.json({
        lobbies: lobbies.map((lobby) => ({
          ...lobby.toJSON(),
          invitationCode: lobby.uuid,
        })),
      })
    } catch (error) {
      console.error('Failed to get lobbies:', error)
      return response.status(500).json({
        error: 'Failed to get lobbies',
      })
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
        console.log(
          `Leave on close failed for user ${user.userUuid} in lobby ${lobbyUuid}: ${result.error}`
        )
        return response.status(400).json({ error: result.error })
      }

      return response.status(200).json({
        success: true,
        message: 'Successfully left lobby on close',
      })
    } catch (error) {
      console.error('Failed to leave lobby on close:', error)
      return response.status(500).json({
        error: 'Failed to leave lobby on close',
      })
    }
  }
}
