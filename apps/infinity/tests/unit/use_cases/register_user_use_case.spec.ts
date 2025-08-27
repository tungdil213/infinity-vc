import { test } from '@japa/runner'
import { RegisterUserUseCase } from '../../../app/application/use_cases/register_user_use_case.js'
import { UserFactory } from '../../factories/user_factory.js'
import { UserSerializer } from '../../../app/application/serializers/user_serializer.js'

// Mock repositories
const mockUserRepository = {
  findByEmail: async (email: string) => null,
  save: async (user: any) => Promise.resolve(),
  findByUuid: async (uuid: string) => null
}

const mockPlayerRepository = {
  save: async (player: any) => Promise.resolve(),
  findByUuid: async (uuid: string) => null
}

test.group('RegisterUserUseCase', (group) => {
  let registerUserUseCase: RegisterUserUseCase

  group.setup(() => {
    registerUserUseCase = new RegisterUserUseCase(
      mockUserRepository as any,
      mockPlayerRepository as any
    )
  })

  group.teardown(() => {
    UserFactory.resetCounter()
  })

  test('should register user successfully with valid data', async ({ assert }) => {
    // Arrange
    const request = UserFactory.registerUserRequest({
      fullName: 'John Doe',
      email: 'john@test.com',
      password: 'securePassword123'
    })

    // Act
    const result = await registerUserUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isDefined(result.value)
    assert.equal(result.value.fullName, 'John Doe')
    assert.equal(result.value.email, 'john@test.com')
    assert.isDefined(result.value.userUuid)
  })

  test('should fail with empty full name', async ({ assert }) => {
    // Arrange
    const request = UserFactory.registerUserRequest({
      fullName: '',
      email: 'john@test.com'
    })

    // Act
    const result = await registerUserUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'fullName')
  })

  test('should fail with invalid email format', async ({ assert }) => {
    // Arrange
    const request = UserFactory.registerUserRequest({
      email: 'invalid-email'
    })

    // Act
    const result = await registerUserUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'email')
  })

  test('should fail with weak password', async ({ assert }) => {
    // Arrange
    const request = UserFactory.registerUserRequest({
      password: '123'
    })

    // Act
    const result = await registerUserUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'password')
  })

  test('should fail when email already exists', async ({ assert }) => {
    // Arrange
    const existingUser = UserFactory.userDto({
      email: 'existing@test.com'
    })

    const mockUserRepositoryWithExisting = {
      ...mockUserRepository,
      findByEmail: async (email: string) => 
        email === 'existing@test.com' ? existingUser : null
    }

    const useCase = new RegisterUserUseCase(
      mockUserRepositoryWithExisting as any,
      mockPlayerRepository as any
    )

    const request = UserFactory.registerUserRequest({
      email: 'existing@test.com'
    })

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'email')
  })

  test('should hash password before saving', async ({ assert }) => {
    // Arrange
    let savedUser: any = null
    const mockUserRepositoryWithSave = {
      ...mockUserRepository,
      save: async (user: any) => {
        savedUser = user
        return Promise.resolve()
      }
    }

    const useCase = new RegisterUserUseCase(
      mockUserRepositoryWithSave as any,
      mockPlayerRepository as any
    )

    const request = UserFactory.registerUserRequest({
      password: 'plainTextPassword'
    })

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isDefined(savedUser)
    assert.notEqual(savedUser.password, 'plainTextPassword')
  })

  test('should create corresponding player entity', async ({ assert }) => {
    // Arrange
    let savedPlayer: any = null
    const mockPlayerRepositoryWithSave = {
      ...mockPlayerRepository,
      save: async (player: any) => {
        savedPlayer = player
        return Promise.resolve()
      }
    }

    const useCase = new RegisterUserUseCase(
      mockUserRepository as any,
      mockPlayerRepositoryWithSave as any
    )

    const request = UserFactory.registerUserRequest({
      fullName: 'John Doe'
    })

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isDefined(savedPlayer)
    assert.equal(savedPlayer.nickName, 'John Doe')
  })

  test('should trim whitespace from inputs', async ({ assert }) => {
    // Arrange
    const request = UserFactory.registerUserRequest({
      fullName: '  John Doe  ',
      email: '  john@test.com  '
    })

    // Act
    const result = await registerUserUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.fullName, 'John Doe')
    assert.equal(result.value.email, 'john@test.com')
  })
})
