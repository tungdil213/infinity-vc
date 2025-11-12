import type { CommandHandler } from '#shared_kernel/application/command.interface'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import { Result } from '#shared_kernel/domain/result'
import type { RegisterUserCommand } from './register_user.command.js'
import type { User } from '../../../domain/entities/user.entity.js'
import type { UserRepository } from '../../../domain/repositories/user_repository.interface.js'
import { Email } from '../../../domain/value_objects/email.vo.js'
import { Password } from '../../../domain/value_objects/password.vo.js'
import { Username } from '../../../domain/value_objects/username.vo.js'
import { User as UserEntity } from '../../../domain/entities/user.entity.js'
import { UserRegisteredEvent } from '../../../domain/events/user_registered.event.js'

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand, User> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: RegisterUserCommand): Promise<Result<User>> {
    // 1. Create Value Objects
    const emailResult = Email.create(command.email)
    if (emailResult.isFailure) {
      return Result.fail(emailResult.error)
    }

    const passwordResult = await Password.create(command.password)
    if (passwordResult.isFailure) {
      return Result.fail(passwordResult.error)
    }

    const usernameResult = Username.create(command.username)
    if (usernameResult.isFailure) {
      return Result.fail(usernameResult.error)
    }

    // 2. Check email uniqueness
    const existingUserByEmail = await this.userRepository.findByEmail(emailResult.value)
    if (existingUserByEmail.isSuccess && existingUserByEmail.value !== null) {
      return Result.fail('Email already exists')
    }

    // 3. Check username uniqueness
    const existingUserByUsername = await this.userRepository.findByUsername(usernameResult.value)
    if (existingUserByUsername.isSuccess && existingUserByUsername.value !== null) {
      return Result.fail('Username already exists')
    }

    // 4. Create User entity
    const userResult = UserEntity.create({
      email: emailResult.value,
      password: passwordResult.value,
      username: usernameResult.value,
      fullName: command.fullName,
      isActive: true,
    })

    if (userResult.isFailure) {
      return Result.fail(userResult.error)
    }

    // 5. Persist
    const saveResult = await this.userRepository.save(userResult.value)
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error)
    }

    // 6. Emit domain event
    await this.eventBus.publish(
      new UserRegisteredEvent(saveResult.value.id, command.email, command.username)
    )

    return Result.ok(saveResult.value)
  }
}
