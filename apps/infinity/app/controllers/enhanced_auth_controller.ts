import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RegisterUserUseCase } from '#application/use_cases/register_user_use_case'
import AuthenticateUserUseCase from '#application/use_cases/authenticate_user_use_case'
import { DatabaseUserRepository } from '#infrastructure/repositories/database_user_repository'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import app from '@adonisjs/core/services/app'

@inject()
export default class EnhancedAuthController {
  constructor(
    private userRepository: DatabaseUserRepository,
    private authenticateUserUseCase: AuthenticateUserUseCase
  ) {}

  /**
   * Show login form
   */
  async showLogin({ inertia, request }: HttpContext) {
    const redirect = request.input('redirect', '/lobbies')

    return inertia.render('auth/login', {
      redirect,
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
    const { fullName, email, password, password_confirmation } = request.only([
      'fullName',
      'email',
      'password',
      'password_confirmation',
    ])
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

      if (password !== password_confirmation) {
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

      if (!result.success) {
        session.flash('error', result.error || 'Failed to create account')
        return response.redirect().back()
      }

      // Auto-login the newly created user
      const newUser = await User.query().where('email', email.trim().toLowerCase()).first()
      if (newUser) {
        await auth.use('web').login(newUser)
        session.flash('success', `Account created successfully! Welcome to Infinity Game, ${newUser.fullName}!`)
      } else {
        session.flash('success', 'Account created successfully! Please log in.')
      }
      return response.redirect(redirect)
    } catch (error) {
      console.error('Registration error:', error)
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

    console.log('🔐 Login attempt:', { email, redirect })

    try {
      // Validation
      if (!email || email.trim().length === 0) {
        console.log('❌ Login failed: Email is required')
        session.flash('error', 'Email is required')
        return response.redirect().back()
      }

      if (!password || password.length === 0) {
        console.log('❌ Login failed: Password is required')
        session.flash('error', 'Password is required')
        return response.redirect().back()
      }

      console.log('✅ Validation passed, searching for user...')

      // Find user using Lucid model directly for auth
      const user = await User.query().where('email', email.trim().toLowerCase()).first()
      if (!user) {
        console.log('❌ Login failed: User not found for email:', email.trim().toLowerCase())
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      console.log('✅ User found:', { userUuid: user.userUuid, fullName: user.fullName })

      // Verify password
      const isValidPassword = await hash.verify(user.password, password)
      if (!isValidPassword) {
        console.log('❌ Login failed: Invalid password for user:', user.userUuid)
        session.flash('error', 'Invalid email or password')
        return response.redirect().back()
      }

      console.log('✅ Password verified, logging in user...')

      // Log the user in
      await auth.use('web').login(user)

      console.log('✅ User logged in successfully, redirecting to:', redirect)

      session.flash('success', `Welcome back, ${user.fullName}!`)
      return response.redirect(redirect)
    } catch (error) {
      console.error('❌ Login error:', error)
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
      console.error('Profile error:', error)
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
      console.error('Auth check error:', error)
      return response.status(500).json({
        error: 'Failed to check authentication',
      })
    }
  }
}
