import { HttpContext } from '@adonisjs/core/http'

export default class SimpleLobbiesController {
  /**
   * Display homepage/welcome page
   */
  async welcome({ inertia, auth }: HttpContext) {
    const user = auth.user

    return inertia.render('welcome', {
      user: user
        ? {
            id: user.id,
            fullName: user.fullName || 'User',
            email: user.email,
          }
        : null,
    })
  }

  /**
   * Display lobbies list page
   */
  async index({ inertia, auth }: HttpContext) {
    const user = auth.user!

    // Mock lobbies data for testing
    const mockLobbies = [
      {
        uuid: 'lobby-1',
        name: 'Test Lobby 1',
        description: 'A test lobby for multiplayer gaming',
        maxPlayers: 4,
        currentPlayers: 2,
        status: 'OPEN',
        createdBy: 'user-1',
        players: [
          { uuid: 'user-1', nickName: 'Player 1' },
          { uuid: 'user-2', nickName: 'Player 2' },
        ],
        invitationCode: 'lobby-1',
      },
      {
        uuid: 'lobby-2',
        name: 'Test Lobby 2',
        description: 'Another test lobby',
        maxPlayers: 6,
        currentPlayers: 1,
        status: 'WAITING',
        createdBy: 'user-3',
        players: [{ uuid: 'user-3', nickName: 'Player 3' }],
        invitationCode: 'lobby-2',
      },
    ]

    return inertia.render('lobbies', {
      lobbies: mockLobbies,
      user: {
        uuid: user.userUuid || 'test-user',
        nickName: user.fullName || 'Test User',
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
        uuid: user.userUuid || 'test-user',
        fullName: user.fullName || 'Test User',
      },
    })
  }

  /**
   * Create a new lobby (mock implementation)
   */
  async store({ request, response, session }: HttpContext) {
    const {
      name,
      description,
      maxPlayers = 4,
    } = request.only(['name', 'description', 'maxPlayers'])

    try {
      // Validate required fields
      if (!name || name.trim().length === 0) {
        session.flash('error', 'Lobby name is required')
        return response.redirect().back()
      }

      // Mock lobby creation
      const lobbyUuid = `lobby-${Date.now()}`

      session.flash('success', 'Lobby created successfully!')
      return response.redirect(`/lobbies/${lobbyUuid}`)
    } catch (error) {
      console.error('Failed to create lobby:', error)
      session.flash('error', 'Failed to create lobby. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Display specific lobby
   */
  async show({ params, inertia, auth }: HttpContext) {
    const user = auth.user!
    const { uuid } = params

    // Mock lobby data
    const mockLobby = {
      uuid: uuid,
      name: 'Test Lobby',
      description: 'A test lobby for multiplayer gaming',
      maxPlayers: 4,
      status: 'OPEN',
      createdBy: 'user-1',
      players: [
        { uuid: 'user-1', nickName: 'Player 1' },
        { uuid: user.userUuid || 'test-user', nickName: user.fullName || 'Test User' },
      ],
      invitationCode: uuid,
      hasPassword: false,
    }

    return inertia.render('lobby', {
      lobby: mockLobby,
      user: {
        uuid: user.userUuid || 'test-user',
        nickName: user.fullName || 'Test User',
      },
    })
  }

  /**
   * Display join lobby page by invitation code
   */
  async showJoinByInvite({ params, inertia, auth }: HttpContext) {
    const { invitationCode } = params
    const user = auth.user

    // Mock lobby data
    const mockLobby = {
      uuid: invitationCode,
      name: 'Test Lobby',
      description: 'Join this awesome lobby!',
      maxPlayers: 4,
      currentPlayers: 2,
      hasPassword: false,
    }

    return inertia.render('join-lobby', {
      lobby: mockLobby,
      user: user
        ? {
            uuid: user.userUuid || 'test-user',
            fullName: user.fullName || 'Test User',
          }
        : null,
      invitationCode,
    })
  }

  /**
   * Join a lobby by invitation code (mock)
   */
  async joinByInvite({ params, response, session }: HttpContext) {
    const { invitationCode } = params

    try {
      session.flash('success', 'Successfully joined the lobby!')
      return response.redirect(`/lobbies/${invitationCode}`)
    } catch (error) {
      console.error('Failed to join lobby by invitation:', error)
      session.flash('error', 'Failed to join lobby. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * API endpoint to get lobby data (mock)
   */
  async apiShow({ params, response }: HttpContext) {
    const { uuid } = params

    const mockLobby = {
      uuid: uuid,
      name: 'Test Lobby',
      description: 'A test lobby',
      maxPlayers: 4,
      status: 'OPEN',
      players: [{ uuid: 'user-1', nickName: 'Player 1' }],
      invitationCode: uuid,
    }

    return response.json({
      lobby: mockLobby,
    })
  }

  /**
   * API endpoint to get all lobbies (mock)
   */
  async apiIndex({ response }: HttpContext) {
    const mockLobbies = [
      {
        uuid: 'lobby-1',
        name: 'Test Lobby 1',
        maxPlayers: 4,
        status: 'OPEN',
        invitationCode: 'lobby-1',
      },
    ]

    return response.json({
      lobbies: mockLobbies,
    })
  }
}
