import { test } from '@japa/runner'
import { RegisterUserHandler } from '#iam/application/commands/register_user/register_user.handler'
import { RegisterUserCommand } from '#iam/application/commands/register_user/register_user.command'
import type { UserRepository } from '#iam/domain/repositories/user_repository.interface'
import type { User } from '#iam/domain/entities/user.entity'
import type { Email } from '#iam/domain/value_objects/email.vo'
import type { Username } from '#iam/domain/value_objects/username.vo'
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

function makeSut() {
  const userRepository = new InMemoryUserRepository()
  const eventBus = new FakeEventBus()
  const handler = new RegisterUserHandler(userRepository, eventBus)

  return { handler, userRepository, eventBus }
}

test.group('IAM - RegisterUserHandler', () => {
  test('should register a new user successfully', async ({ assert }) => {
    const { handler, eventBus } = makeSut()

    const command = new RegisterUserCommand(
      'john@example.com',
      'Password123!',
      'johndoe',
      'John Doe'
    )

    const result = await handler.handle(command)

    assert.isTrue(result.isSuccess)
    assert.exists(result.value)
    assert.equal(result.value?.email.value, 'john@example.com')
    assert.equal(result.value?.username.value, 'johndoe')
    assert.equal(result.value?.fullName, 'John Doe')
    assert.lengthOf(eventBus.published, 1)
  })

  test('should fail when email format is invalid', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new RegisterUserCommand('invalid-email', 'Password123!', 'johndoe', 'John Doe')

    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Email format is invalid')
  })

  test('should fail when password is too weak', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new RegisterUserCommand('john@example.com', '123', 'johndoe', 'John Doe')

    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'must be at least')
  })

  test('should fail when username is invalid', async ({ assert }) => {
    const { handler } = makeSut()

    const command = new RegisterUserCommand('john@example.com', 'Password123!', 'jo', 'John Doe')

    const result = await handler.handle(command)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Username')
  })

  test('should fail when email already exists', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new RegisterUserHandler(userRepository, eventBus)

    const firstCommand = new RegisterUserCommand(
      'john@example.com',
      'Password123!',
      'johndoe',
      'John Doe'
    )

    const duplicateCommand = new RegisterUserCommand(
      'john@example.com',
      'Password123!',
      'anotheruser',
      'John Other'
    )

    const firstResult = await handler.handle(firstCommand)
    assert.isTrue(firstResult.isSuccess)

    const duplicateResult = await handler.handle(duplicateCommand)
    assert.isTrue(duplicateResult.isFailure)
    assert.equal(duplicateResult.error, 'Email already exists')
  })

  test('should fail when username already exists', async ({ assert }) => {
    const userRepository = new InMemoryUserRepository()
    const eventBus = new FakeEventBus()
    const handler = new RegisterUserHandler(userRepository, eventBus)

    const firstCommand = new RegisterUserCommand(
      'john@example.com',
      'Password123!',
      'johndoe',
      'John Doe'
    )

    const duplicateCommand = new RegisterUserCommand(
      'jane@example.com',
      'Password123!',
      'johndoe',
      'Jane Doe'
    )

    const firstResult = await handler.handle(firstCommand)
    assert.isTrue(firstResult.isSuccess)

    const duplicateResult = await handler.handle(duplicateCommand)
    assert.isTrue(duplicateResult.isFailure)
    assert.equal(duplicateResult.error, 'Username already exists')
  })
})
