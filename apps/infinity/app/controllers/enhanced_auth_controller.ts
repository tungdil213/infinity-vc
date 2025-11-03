import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import app from '@adonisjs/core/services/app'
import { createContextLogger } from '#infrastructure/logging/logger'

@inject()
export default class EnhancedAuthController {
  private logger = createContextLogger('AuthController')

  constructor(
    private userRepository: DatabaseUserRepository,
    private authenticateUserUseCase: AuthenticateUserUseCase
  ) {}

  /**
   * Show login form
   */
  async showLogin({ inertia, request, auth }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')
    const user = auth.user

    // Check if user is currently in a lobby
    const currentLobby = user ? await this.userRepository.findCurrentLobby(user.userUuid) : null

    return inertia.render('auth/login', {
      redirect,
      currentLobby: currentLobby
        ? {
            uuid: currentLobby.uuid,
            name: currentLobby.name,
            status: currentLobby.status,
            currentPlayers: currentLobby.players?.length || 0,
            maxPlayers: currentLobby.maxPlayers,
          }
        : null,
    })
  }

  /**
   * Show register form
   */
  async showRegister({ inertia, request }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')

    return inertia.render('auth/register', {
      redirect,
    })
  }

  /**
   * Register new user
   */
  async register({ request, response, auth, session }: HttpContext) {
    const {
      fullName,
      email,
      password,
      password_confirmation: passwordConfirmation,
    } = request.only(['fullName', 'email', 'password', 'password_confirmation'])

    const redirect = request.input('redirect', '/lobbies')

    try {
      // Validation
      if (!fullName || fullName.trim().length === 0) {
        session.flash('error', 'Full name is required')
        return response.redirect().back()
      }

      if (!email || email.trim().length === 0) {
        session.flash('error', 'Email is required')
        return response.redirect().back()
      }

      if (!password || password.length < 8) {
        session.flash('error', 'Password must be at least 8 characters long')
        return response.redirect().back()
      }

      if (password !== passwordConfirmation) {
        session.flash('error', 'Passwords do not match')
        return response.redirect().back()
      }

      // Get use case from container
      const registerUserUseCase = await app.container.make(RegisterUserUseCase)

      // Create user - split fullName into firstName and lastName
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const result = await registerUserUseCase.execute({
        firstName,
        lastName,
        username: email.split('@')[0], // Use email prefix as username
        email: email.trim().toLowerCase(),
        password: password, // Pass plain password, will be hashed by User model
      })

      if (result.isFailure) {
        this.logger.warn({ error: result.error }, 'User registration failed')
        session.flash('error', result.error || 'Failed to create account')
        return response.redirect().back()
      }

      // Auto-login the newly created user
      const newUser = await User.query().where('email', email.trim().toLowerCase()).first()
      if (newUser) {
        await auth.use('web').login(newUser)
        session.flash(
          'success',
          `Account created successfully! Welcome to Infinity Game, ${newUser.fullName}!`
        )
      } else {
        session.flash('success', 'Account created successfully! Please log in.')
      }
      return response.redirect(redirect)
    } catch (error) {
      this.logger.error({ error }, 'Registration error')
      session.flash('error', 'Failed to create account. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Authenticate user
   */
  async login({ request, response, auth, session }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    const redirect = request.input('redirect', '/lobbies')

    this.logger.info({ email, redirect }, 'Login attempt')

    try {
      // Validation
      if (!email || email.trim().length === 0) {
        this.logger.warn('Login failed: Email is required')
        session.flash('error', 'Email is required')
        return response.redirect().back()
      }

      if (!password || password.length === 0) {
        this.logger.warn('Login failed: Password is required')
        session.flash('error', 'Password is required')
        return response.redirect().back()
      }

      this.logger.debug('Validation passed, searching for user')

      // Find user using Lucid model directly for auth
      const user = await User.query().where('email', email.trim().toLowerCase()).first()
      if (!user) {
        this.logger.warn({ email: email.trim().toLowerCase() }, 'Login failed: User not found')
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      this.logger.debug({ userUuid: user.userUuid, fullName: user.fullName }, 'User found')

      // Verify password
      const isValidPassword = await hash.verify(user.password, password)
      if (!isValidPassword) {
        this.logger.warn({ userUuid: user.userUuid }, 'Login failed: Invalid password')
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      this.logger.debug('Password verified, logging in user')

      // Log the user in
      await auth.use('web').login(user)

      this.logger.info({ userUuid: user.userUuid, redirect }, 'User logged in successfully')

      session.flash('success', `Welcome back, ${user.fullName}!`)
      return response.redirect(redirect)
    } catch (error) {
      this.logger.error({ error }, 'Login error')
      session.flash('error', 'Login failed. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Logout user
   */
  async logout({ response, auth, session }: HttpContext) {
    try {
      await auth.use('web').logout()
      session.flash('success', 'You have been logged out successfully')
      return response.redirect('/')
    } catch (error) {
      this.logger.error({ error }, 'Logout error')
      session.flash('error', 'Logout failed')
      return response.redirect().back()
    }
  }

  /**
   * Get current user profile (API)
   */
  async me({ response, auth }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        return response.status(401).json({
          error: 'Not authenticated',
        })
      }

      return response.json({
        user: {
          uuid: user.userUuid,
          fullName: user.fullName,
          email: user.email,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      this.logger.error({ error }, 'Profile retrieval error')
      return response.status(500).json({
        error: 'Failed to retrieve profile',
      })
    }
  }

  /**
   * Check authentication status (API)
   */
  async check({ response, auth }: HttpContext) {
    try {
      const user = auth.user

      return response.json({
        authenticated: !!user,
        user: user
          ? {
              uuid: user.userUuid,
              fullName: user.fullName,
              email: user.email,
            }
          : null,
      })
    } catch (error) {
      this.logger.error({ error }, 'Auth check error')
      return response.status(500).json({
        error: 'Failed to check authentication',
      })
    }
  }
}
