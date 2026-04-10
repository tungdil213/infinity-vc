import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import logger from '@adonisjs/core/services/logger'
import { ClearSocialPresenceUseCase } from '#application/use_cases/clear_social_presence_use_case'
import { RegisterWithInvitationUseCase } from '#application/use_cases/register_with_invitation_use_case'
import { ValidateInvitationCodeUseCase } from '#application/use_cases/validate_invitation_code_use_case'
import BusinessException from '#exceptions/business_exception'
import {
  ErrorClassification,
  ErrorSeverity,
  ToastType,
} from '#exceptions/types/error_classification'
import User from '#models/user'
import { authInvitationCodeValidator } from '#validators/auth_invitation_validator'
import { authLoginValidator } from '#validators/auth_login_validator'
import { authRegisterValidator } from '#validators/auth_register_validator'

const DEFAULT_REDIRECT_PATH = '/lobbies'
const AUTH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  'Invitation code is required': 'auth.register.failure.invitationRequired',
  'Invitation code is invalid': 'auth.register.failure.invitationInvalid',
  'Invitation code has expired': 'auth.register.failure.invitationExpired',
  'Invitation code has been revoked': 'auth.register.failure.invitationRevoked',
  'Invitation code has already been used': 'auth.register.failure.invitationUsed',
  'Invitation code is no longer available': 'auth.register.failure.invitationUnavailable',
  'Invitation code is not valid for this email address':
    'auth.register.failure.invitationEmailMismatch',
  'An account with this information already exists': 'auth.register.failure.accountExists',
  'This name combination is already taken as a nickname': 'auth.register.failure.nicknameCollision',
  'Invalid credentials': 'auth.login.failure.invalidCredentials',
}

@inject()
export default class EnhancedAuthController {
  constructor(
    private readonly validateInvitationCodeUseCase: ValidateInvitationCodeUseCase,
    private readonly registerWithInvitationUseCase: RegisterWithInvitationUseCase,
    private readonly clearSocialPresenceUseCase: ClearSocialPresenceUseCase
  ) {}

  /**
   * Show login form
   */
  async showLogin({ inertia, request }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

    return inertia.render('auth/login', {
      redirect,
      currentLobby: null,
    })
  }

  /**
   * Show register form
   */
  async showRegister({ inertia, request }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))
    const invitationCode =
      typeof request.input('invitationCode') === 'string' ? request.input('invitationCode') : ''

    return inertia.render('auth/register', {
      redirect,
      invitationCode,
    })
  }

  /**
   * Validate invitation code before showing the registration form
   */
  async validateInvitationCode({ request, response, i18n }: HttpContext) {
    const { invitationCode } = await request.validateUsing(authInvitationCodeValidator)
    const result = await this.validateInvitationCodeUseCase.execute({ invitationCode })

    if (result.isFailure) {
      return response.status(400).json({
        valid: false,
        message: this.translateError(i18n, result.error, 'auth.register.failure.invitationInvalid'),
      })
    }

    return response.json({
      valid: true,
      invitation: {
        issuerDisplayName: result.value.issuerDisplayName,
        expiresAt: result.value.invitation.expiresAt?.toISOString() ?? null,
      },
    })
  }

  /**
   * Register new user with invitation code
   */
  async register({ request, response, auth, session, i18n }: HttpContext) {
    const redirect = this.sanitizeRedirectTarget(request.input('redirect'))

    try {
      const { fullName, email, password, invitationCode } =
        await request.validateUsing(authRegisterValidator)
      const normalizedEmail = email.trim().toLowerCase()

      const result = await this.registerWithInvitationUseCase.execute({
        fullName,
        email: normalizedEmail,
        password,
        invitationCode,
      })

      if (result.isFailure) {
        throw this.userSafeError(
          this.translateError(i18n, result.error, 'auth.register.failure.createAccount')
        )
      }

      const newUser = await User.query().where('user_uuid', result.value.user.uuid).first()
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
      if (error instanceof BusinessException) {
        throw error
      }

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

      const user = await User.query().where('email', email.trim().toLowerCase()).first()
      if (!user) {
        session.flash('error', i18n.t('auth.login.failure.invalidCredentials'))
        return response.redirect().back()
      }

      const isValidPassword = await hash.verify(user.password, password)
      if (!isValidPassword) {
        session.flash('error', i18n.t('auth.login.failure.invalidCredentials'))
        return response.redirect().back()
      }

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
      const currentUser = auth.user
      if (currentUser) {
        await this.clearSocialPresenceUseCase.execute({
          userUuid: currentUser.userUuid,
          displayName:
            typeof currentUser.fullName === 'string' && currentUser.fullName.trim().length > 0
              ? currentUser.fullName
              : currentUser.email,
        })
      }
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

  private sanitizeRedirectTarget(rawValue: unknown): string {
    if (typeof rawValue !== 'string') {
      return DEFAULT_REDIRECT_PATH
    }

    const value = rawValue.trim()
    if (!value) {
      return DEFAULT_REDIRECT_PATH
    }

    if (!value.startsWith('/') || value.startsWith('//') || /[\n\r]/.test(value)) {
      return DEFAULT_REDIRECT_PATH
    }

    return value
  }

  private translateError(
    i18n: HttpContext['i18n'],
    error: string | undefined,
    fallbackKey: string
  ): string {
    if (!error) {
      return i18n.t(fallbackKey)
    }

    const translatedKey = AUTH_ERROR_TRANSLATION_KEYS[error] ?? fallbackKey
    const translated = i18n.t(translatedKey)
    if (typeof translated === 'string' && !translated.startsWith('translation missing:')) {
      return translated
    }

    return error
  }

  private userSafeError(message: string): BusinessException {
    return new BusinessException(message, {
      status: 400,
      code: 'E_AUTH_REGISTER_FAILED',
      classification: ErrorClassification.USER_SAFE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      toastType: ToastType.ERROR,
      reportToSentry: false,
    })
  }
}
