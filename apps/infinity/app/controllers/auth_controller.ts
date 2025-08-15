import type { HttpContext } from '@adonisjs/core/http'
import RegisterUserUseCase from '../application/use_cases/register_user_use_case.js'
import AuthenticateUserUseCase from '../application/use_cases/authenticate_user_use_case.js'

export default class AuthController {
  constructor(
    private registerUserUseCase: RegisterUserUseCase,
    private authenticateUserUseCase: AuthenticateUserUseCase
  ) {}

  /**
   * POST /auth/register
   * Register a new user
   */
  async register({ request, response }: HttpContext) {
    try {
      const data = request.only([
        'firstName',
        'lastName',
        'username',
        'email',
        'password',
        'nickName',
      ])

      // TODO: Hash password before passing to use case
      // data.password = await hash.make(data.password)

      const result = await this.registerUserUseCase.execute(data)

      return response.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      })
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      })
    }
  }

  /**
   * POST /auth/login
   * Authenticate user
   */
  async login({ request, response, auth }: HttpContext) {
    try {
      const { email, password } = request.only(['email', 'password'])

      // TODO: Hash password for comparison
      const result = await this.authenticateUserUseCase.execute({ email, password })

      // TODO: Create session with AdonisJS auth
      // await auth.use('web').login(result.user)

      return response.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      })
    } catch (error) {
      return response.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: [error.message],
      })
    }
  }

  /**
   * POST /auth/logout
   * Logout user
   */
  async logout({ response, auth }: HttpContext) {
    try {
      // TODO: Logout with AdonisJS auth
      // await auth.use('web').logout()

      return response.status(200).json({
        success: true,
        message: 'Logout successful',
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Logout failed',
        errors: [error.message],
      })
    }
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  async me({ response, auth }: HttpContext) {
    try {
      // TODO: Get current user from auth
      // const user = auth.user
      // const result = await this.getUserProfileUseCase.execute({ userUuid: user.uuid })

      return response.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          // user: result.user,
          // player: result.player
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        errors: [error.message],
      })
    }
  }
}
