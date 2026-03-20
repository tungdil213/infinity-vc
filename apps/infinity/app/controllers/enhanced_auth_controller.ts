import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { authRegisterValidator } from '#validators/auth_register_validator'
import { authLoginValidator } from '#validators/auth_login_validator'
import { generateUsernameFromEmail } from '#application/services/username_generator'

const DEFAULT_REDIRECT_PATH = '/lobbies'
const AUTH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  'Failed to create account': 'auth.register.failure.createAccount',
  'Invalid credentials': 'auth.login.failure.invalidCredentials',
}

@inject()
export default class EnhancedAuthController {
  /**
   * Show login form
   */
  async showLogin({ inertia, request }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

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
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

    return inertia.render('auth/register', {
      redirect,
    })
  }

  /**
   * Register new user
   */
  async register({ request, response, auth, session, i18n }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

    try {
      const { fullName, email, password } = await request.validateUsing(authRegisterValidator)
      const normalizedEmail = email.trim().toLowerCase()

      // Get use case from container
      const registerUserUseCase = await app.container.make(RegisterUserUseCase)

      // Create user - split fullName into firstName and lastName
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      const username = generateUsernameFromEmail(normalizedEmail)

      const result = await registerUserUseCase.execute({
        firstName,
        lastName,
        username,
        email: normalizedEmail,
        password: password, // Pass plain password, will be hashed by User model
      })

      if (result.isFailure) {
        session.flash('error', this.translateError(i18n, result.error, 'auth.register.failure.createAccount'))
        return response.redirect().back()
      }

      // Auto-login the newly created user
      const newUser = await User.query().where('email', normalizedEmail).first()
      if (newUser) {
        await auth.use('web').login(newUser)
        session.flash(
          'success',
          i18n.t('auth.register.success.welcome', {
            name: newUser.fullName,
          })
        )
      } else {
        session.flash('success', i18n.t('auth.register.success.createdPleaseLogin'))
      }
      return response.redirect(redirect)
    } catch (error) {
      logger.error({ error }, 'Registration error')
      session.flash('error', i18n.t('auth.register.failure.tryAgain'))
      return response.redirect().back()
    }
  }

  /**
   * Authenticate user
   */
  async login({ request, response, auth, session, i18n }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

    try {
      const { email, password } = await request.validateUsing(authLoginValidator)

      // Find user using Lucid model directly for auth
      const user = await User.query().where('email', email.trim().toLowerCase()).first()
      if (!user) {
        session.flash('error', i18n.t('auth.login.failure.invalidCredentials'))
        return response.redirect().back()
      }

      // Verify password
      const isValidPassword = await hash.verify(user.password, password)
      if (!isValidPassword) {
        session.flash('error', i18n.t('auth.login.failure.invalidCredentials'))
        return response.redirect().back()
      }

      // Log the user in
      await auth.use('web').login(user)

      session.flash(
        'success',
        i18n.t('auth.login.success.welcomeBack', {
          name: user.fullName,
        })
      )
      return response.redirect(redirect)
    } catch (error) {
      logger.error({ error }, 'Login error')
      session.flash('error', i18n.t('auth.login.failure.tryAgain'))
      return response.redirect().back()
    }
  }

  /**
   * Logout user
   */
  async logout({ response, auth, session, i18n }: HttpContext) {
    try {
      await auth.use('web').logout()
      session.flash('success', i18n.t('auth.logout.success'))
      return response.redirect('/')
    } catch (error) {
      logger.error({ error }, 'Logout error')
      session.flash('error', i18n.t('auth.logout.failure'))
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
          role: user.normalizedRole,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      if ((error as any)?.code !== 'E_UNAUTHORIZED_ACCESS') {
        logger.error({ error }, 'Profile error')
      }

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
                role: user.normalizedRole,
              }
            : null,
      })
    } catch (error) {
      if ((error as any)?.code !== 'E_UNAUTHORIZED_ACCESS') {
        logger.error({ error }, 'Auth check error')
      }

      return response.status(200).json({
        authenticated: false,
        user: null,
      })
    }
  }

  /**
   * Prevent open redirects by accepting only safe internal paths.
   */
  private sanitizeRedirectTarget(rawValue: unknown): string {
    if (typeof rawValue !== 'string') {
      return DEFAULT_REDIRECT_PATH
    }

    const value = rawValue.trim()
    if (!value) {
      return DEFAULT_REDIRECT_PATH
    }

    // Must stay relative to this app and avoid protocol-relative or control chars.
    if (!value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) {
      return DEFAULT_REDIRECT_PATH
    }

    return value
  }

  private translateError(i18n: HttpContext['i18n'], error: string | undefined, fallbackKey: string): string {
    if (!error) {
      return i18n.t(fallbackKey)
    }

    const translatedKey = AUTH_ERROR_TRANSLATION_KEYS[error]
    if (translatedKey) {
      return i18n.t(translatedKey)
    }

    return error
  }
}
