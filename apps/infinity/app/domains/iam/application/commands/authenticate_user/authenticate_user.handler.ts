import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { AuthenticateUserCommand } from './authenticate_user.command.js'
import type { User } from '../../../domain/entities/user.entity.js'
import type { UserRepository } from '../../../domain/repositories/user_repository.interface.js'
import { Email } from '../../../domain/value_objects/email.vo.js'
import { UserLoggedInEvent } from '../../../domain/events/user_logged_in.event.js'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('AuthenticateUserHandler')

export class AuthenticateUserHandler implements CommandHandler<AuthenticateUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: AuthenticateUserCommand): Promise<Result<User>> {
    logger.debug({ email: command.email }, 'Starting authentication')

    // 1. Validate email format
    const emailResult = Email.create(command.email)
    if (emailResult.isFailure) {
      logger.warn({ email: command.email }, 'Invalid email format')
      return Result.fail('Invalid email format')
    }

    // 2. Find user by email
    const userResult = await this.userRepository.findByEmail(emailResult.value)
    if (userResult.isFailure) {
      logger.warn({ email: command.email, error: userResult.error }, 'Repository error')
      return Result.fail('Invalid credentials')
    }

    if (userResult.value === null) {
      logger.warn({ email: command.email }, 'User not found in database')
      return Result.fail('Invalid credentials')
    }

    const user = userResult.value
    logger.debug({ email: command.email, userId: user.id, isActive: user.isActive }, 'User found')

    // 3. Authenticate
    const authResult = await user.authenticate(command.password)
    if (authResult.isFailure) {
      logger.warn({ email: command.email, error: authResult.error }, 'Password verification failed')
      return Result.fail('Invalid credentials')
    }

    logger.info({ email: command.email, userId: user.id }, 'Authentication successful')

    // 4. Emit event
    await this.eventBus.publish(new UserLoggedInEvent(user.id, command.email))

    return Result.ok(user)
  }
}
