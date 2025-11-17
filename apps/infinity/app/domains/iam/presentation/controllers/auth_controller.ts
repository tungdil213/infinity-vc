import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RegisterUserHandler } from '../../application/commands/register_user/register_user.handler.js'
import { RegisterUserCommand } from '../../application/commands/register_user/register_user.command.js'
import { AuthenticateUserHandler } from '../../application/commands/authenticate_user/authenticate_user.handler.js'
import { AuthenticateUserCommand } from '../../application/commands/authenticate_user/authenticate_user.command.js'
import { LucidUserRepository } from '../../infrastructure/persistence/user_repository.lucid.js'
import { EventBusService } from '#shared_kernel/infrastructure/event_bus.service'
import { createContextLogger } from '#infrastructure/logging/logger'
import UserModel from '#domains/iam/infrastructure/persistence/user.model'

/**
 * IAM Domain - Authentication Controller
 * Handles user registration and authentication using DDD handlers
 */
@inject()
export default class AuthController {
  private logger = createContextLogger('IAM.AuthController')

  constructor(
    private userRepository: LucidUserRepository,
    private eventBus: EventBusService
  ) {}

  /**
   * Show login form
   */
  async showLogin({ inertia, request }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')

    // TODO: Get current lobby from Lobby domain
    const currentLobby = null

    return inertia.render('auth/login', {
      redirect,
      currentLobby,
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
   * Register new user using DDD Handler
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
      // Basic validation
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

      // Generate username from email (before @)
      const username = email.split('@')[0].toLowerCase()

      // Use DDD Handler
      const handler = new RegisterUserHandler(this.userRepository, this.eventBus)
      const command = new RegisterUserCommand(email, password, username, fullName)

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.error({ error: result.error }, 'Registration failed')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      const user = result.value

      // Login user
      await auth.use('web').login(user as any) // TODO: Adapt User entity to Lucid model

      session.flash('success', 'Registration successful! Welcome!')
      this.logger.info({ userId: user.id }, 'User registered successfully')

      return response.redirect(redirect)
    } catch (error) {
      this.logger.error(
        {
          message: error.message,
          stack: error.stack,
          error: String(error),
        },
        'Unexpected error during registration'
      )
      session.flash('error', 'An unexpected error occurred: ' + error.message)
      return response.redirect().back()
    }
  }

  /**
   * Login user using DDD Handler
   */
  async login({ request, response, auth, session }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    const redirect = request.input('redirect', '/lobbies')

    try {
      // Use DDD Handler
      const handler = new AuthenticateUserHandler(this.userRepository, this.eventBus)
      const command = new AuthenticateUserCommand(email, password)

      const result = await handler.handle(command)

      if (result.isFailure) {
        this.logger.warn({ email }, 'Authentication failed')
        session.flash('error', result.error)
        return response.redirect().back()
      }

      const userEntity = result.value

      // Récupérer le modèle Lucid pour auth.login()
      // Le handler retourne une entité DDD, mais auth.login() attend un modèle Lucid
      const userModel = await UserModel.findBy('userUuid', userEntity.id)

      if (!userModel) {
        this.logger.error({ userId: userEntity.id }, 'User model not found after authentication')
        session.flash('error', 'An error occurred during login')
        return response.redirect().back()
      }

      // Login user avec le modèle Lucid
      await auth.use('web').login(userModel)

      session.flash('success', 'Login successful!')
      this.logger.info({ userId: userEntity.id, email }, 'User logged in')

      return response.redirect(redirect)
    } catch (error) {
      this.logger.error(
        {
          message: error.message,
          stack: error.stack,
          error: String(error),
        },
        'Unexpected error during login'
      )
      session.flash('error', 'An unexpected error occurred: ' + error.message)
      return response.redirect().back()
    }
  }

  /**
   * Logout user
   */
  async logout({ auth, response, session }: HttpContext) {
    await auth.use('web').logout()
    session.flash('success', 'Logged out successfully')
    return response.redirect('/')
  }
}
