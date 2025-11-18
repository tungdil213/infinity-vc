import { test } from '@japa/runner'
import { AuthenticateUserHandler } from '#iam/application/commands/authenticate_user/authenticate_user.handler'
import { AuthenticateUserCommand } from '#iam/application/commands/authenticate_user/authenticate_user.command'
import type { UserRepository } from '#iam/domain/repositories/user_repository.interface'
import type { User } from '#iam/domain/entities/user.entity'
import { User as UserEntity } from '#iam/domain/entities/user.entity'
import type { Email } from '#iam/domain/value_objects/email.vo'
import { Email as EmailVO } from '#iam/domain/value_objects/email.vo'
import type { Username } from '#iam/domain/value_objects/username.vo'
import { Username as UsernameVO } from '#iam/domain/value_objects/username.vo'
import { Password } from '#iam/domain/value_objects/password.vo'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import type { DomainEvent } from '#shared_kernel/domain/events/domain_event'
import { Result } from '#shared_kernel/domain/result'

class InMemoryUserRepository implements UserRepository {
  private users: User[] = []

  async save(user: User): Promise<Result<User>> {
    this.users.push(user)
    return Result.ok(user)
  }

  async findById(id: string): Promise<Result<User | null>> {
    const found = this.users.find((u) => u.id === id) || null
    return Result.ok(found)
  }

  async delete(id: string): Promise<Result<void>> {
    this.users = this.users.filter((u) => u.id !== id)
    return Result.ok()
  }

  async exists(id: string): Promise<boolean> {
    return this.users.some((u) => u.id === id)
  }

  async findAll(): Promise<Result<User[]>> {
    return Result.ok(this.users)
  }

  async findByEmail(email: Email): Promise<Result<User | null>> {
    const found = this.users.find((u) => u.email.value === email.value) || null
    return Result.ok(found)
  }

  async findByUsername(username: Username): Promise<Result<User | null>> {
    const found = this.users.find((u) => u.username.value === username.value) || null
    return Result.ok(found)
  }
}

class FakeEventBus implements EventBus {
  public published: DomainEvent[] = []

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.published.push(...events)
  }

  subscribe(): void {}
  unsubscribe(): void {}
}

async function makeUser(params: {
  email: string
  password: string
  username: string
  fullName?: string
  isActive?: boolean
}): Promise<User> {
  const emailResult = EmailVO.create(params.email)
  if (emailResult.isFailure) {
    throw new Error(emailResult.error)
  }

  const usernameResult = UsernameVO.create(params.username)
  if (usernameResult.isFailure) {
    throw new Error(usernameResult.error)
  }

  const passwordResult = await Password.create(params.password)
  if (passwordResult.isFailure) {
    throw new Error(passwordResult.error)
  }

  const userResult = UserEntity.create({
    email: emailResult.value,
    password: passwordResult.value,
    username: usernameResult.value,
    fullName: params.fullName,
    isActive: params.isActive ?? true,
  })

  if (userResult.isFailure) {
    throw new Error(userResult.error)
  }

  return userResult.value
}

test.group('IAM - AuthenticateUserHandler', () => {
  test('should authenticate successfully with valid credentials', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const user = await makeUser({
      email: 'john@example.com',
      password: 'Password123!',
      username: 'johndoe',
      fullName: 'John Doe',
    })

    await userRepository.save(user)

    const command = new AuthenticateUserCommand('john@example.com', 'Password123!')
    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)
    assert.exists(result.value)
    assert.equal(result.value?.id, user.id)
    assert.lengthOf(eventBus.published, 1)
  })

  test('should fail when email format is invalid', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const command = new AuthenticateUserCommand('invalid-email', 'Password123!')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Invalid email format')
  })

  test('should fail when user is not found', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const command = new AuthenticateUserCommand('missing@example.com', 'Password123!')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Invalid credentials')
  })

  test('should fail when password is incorrect', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const user = await makeUser({
      email: 'john@example.com',
      password: 'Password123!',
      username: 'johndoe',
      fullName: 'John Doe',
    })

    await userRepository.save(user)

    const command = new AuthenticateUserCommand('john@example.com', 'WrongPassword!')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Invalid credentials')
  })

  test('should fail when user account is inactive', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const user = await makeUser({
      email: 'john@example.com',
      password: 'Password123!',
      username: 'johndoe',
      fullName: 'John Doe',
      isActive: false,
    })

    await userRepository.save(user)

    const command = new AuthenticateUserCommand('john@example.com', 'Password123!')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    // L'implémentation masque la raison exacte derrière "Invalid credentials"
    assert.equal(result.error, 'Invalid credentials')
  })

  test('should map repository failures to invalid credentials', async ({ assert }) => {
    class FailingUserRepository implements UserRepository {
      async save(): Promise<Result<User>> {
        return Result.fail('Not implemented')
      }

      async findById(): Promise<Result<User | null>> {
        return Result.fail('Not implemented')
      }

      async delete(): Promise<Result<void>> {
        return Result.fail('Not implemented')
      }

      async exists(): Promise<boolean> {
        return false
      }

      async findAll(): Promise<Result<User[]>> {
        return Result.fail('Not implemented')
      }

      async findByEmail(): Promise<Result<User | null>> {
        return Result.fail('Database error')
      }

      async findByUsername(): Promise<Result<User | null>> {
        return Result.fail('Not implemented')
      }
    }

    const userRepository = new FailingUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new AuthenticateUserHandler(userRepository, eventBus)

    const command = new AuthenticateUserCommand('john@example.com', 'Password123!')
    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    // Le handler masque les erreurs repo derrière "Invalid credentials"
    assert.equal(result.error, 'Invalid credentials')
  })
})
