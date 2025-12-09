import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
// import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case' // TODO: Use
// import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository' // TODO: Use
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { authRegisterValidator } from '#validators/auth_register_validator'
import { authLoginValidator } from '#validators/auth_login_validator'

@inject()
export default class EnhancedAuthController {
  // TODO: Inject these when needed
  // constructor(
  //   private userRepository: DatabaseUserRepository,
  //   private authenticateUserUseCase: AuthenticateUserUseCase
  // ) {}

  /**
   * Show login form
   */
  async showLogin({ inertia, request }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')

    // Check if user is currently in a lobby
    // TODO: Implement findCurrentLobby in UserRepository
    // const currentLobby = user ? await this.userRepository.findCurrentLobby(user.userUuid) : null

    return inertia.render('auth/login', {
      redirect,
      currentLobby: null, // Feature not yet implemented
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
    const redirect = request.input('redirect', '/lobbies')

    try {
      const { fullName, email, password } = await request.validateUsing(authRegisterValidator)

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
      logger.error({ error }, 'Registration error')
      session.flash('error', 'Failed to create account. Please try again.')
      return response.redirect().back()
    }
  }

  /**
   * Authenticate user
   */
  async login({ request, response, auth, session }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')

    try {
      const { email, password } = await request.validateUsing(authLoginValidator)

      // Find user using Lucid model directly for auth
      const user = await User.query().where('email', email.trim().toLowerCase()).first()
      if (!user) {
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      // Verify password
      const isValidPassword = await hash.verify(user.password, password)
      if (!isValidPassword) {
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      // Log the user in
      await auth.use('web').login(user)

      session.flash('success', `Welcome back, ${user.fullName}!`)
      return response.redirect(redirect)
    } catch (error) {
      logger.error({ error }, 'Login error')
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
      console.error('Logout error:', error)
      session.flash('error', 'Logout failed')
      return response.redirect().back()
    }
  }

  /**
   * Get current user profile (API)
   * Always returns 200 with an `authenticated` flag and `user` payload or null.
   */
  async me({ response, auth }: HttpContext) {
    try {
      await auth.authenticate()
      const user = auth.user

      if (!user) {
        return response.status(200).json({
          authenticated: false,
          user: null,
        })
      }

      return response.status(200).json({
        authenticated: true,
        user: {
          uuid: user.userUuid,
          fullName: user.fullName,
          email: user.email,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Profile error')
      return response.status(200).json({
        authenticated: false,
        user: null,
      })
    }
  }

  /**
   * Check authentication status (API)
   * Always returns 200 with an `authenticated` flag and `user` payload or null.
   */
  async check({ response, auth }: HttpContext) {
    try {
      await auth.authenticate()
      const user = auth.user

      return response.status(200).json({
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
      logger.error({ error }, 'Auth check error')
      return response.status(200).json({
        authenticated: false,
        user: null,
      })
    }
  }
}
