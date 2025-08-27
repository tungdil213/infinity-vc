import { test } from '@japa/runner'
import { RegisterUserUseCase } from '../../../app/application/use_cases/register_user_use_case.js'
import { InMemoryUserRepository } from '../../../app/infrastructure/repositories/in_memory_user_repository.js'
import { InMemoryPlayerRepository } from '../../../app/infrastructure/repositories/in_memory_player_repository.js'
import User from '../../../app/domain/entities/user.js'

test.group('RegisterUserUseCase', (group) => {
  let useCase: RegisterUserUseCase
  let userRepository: InMemoryUserRepository
  let playerRepository: InMemoryPlayerRepository

  group.setup(() => {
    userRepository = new InMemoryUserRepository()
    playerRepository = new InMemoryPlayerRepository()
    useCase = new RegisterUserUseCase(userRepository, playerRepository)
  })

  test('should register a new user successfully', async ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      nickName: 'JohnnyD',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isSuccess)
    assert.exists(result.value!.user)
    assert.exists(result.value!.player)
    assert.equal(result.value!.user.email, 'john@example.com')
    assert.equal(result.value!.player.nickName, 'JohnnyD')
  })

  test('should fail when email already exists', async ({ assert }) => {
    const existingUser = User.create({ 
      firstName: 'Existing',
      lastName: 'User',
      username: 'existinguser',
      email: 'john@example.com',
      password: 'password123'
    })
    await userRepository.save(existingUser)

    const userData = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'janesmith',
      email: 'john@example.com', // Same email
      password: 'password123',
      nickName: 'JaneS',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'An account with this information already exists')
  })

  test('should fail when username already exists', async ({ assert }) => {
    const existingUser = User.create({ 
      firstName: 'Existing',
      lastName: 'User',
      username: 'johndoe',
      email: 'existing@example.com',
      password: 'password123'
    })
    await userRepository.save(existingUser)

    const userData = {
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'johndoe', // Same username
      email: 'jane@example.com',
      password: 'password123',
      nickName: 'JaneS',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Username is already taken')
  })

  test('should fail with invalid user data', async ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'jo', // Too short
      email: 'john@example.com',
      password: 'password123',
      nickName: 'JohnnyD',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'must be between 3 and 50 characters')
  })

  test('should fail with invalid player data', async ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      nickName: 'Jo', // Too short
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'must be between 3 and 30 characters')
  })

  test('should save both user and player to repositories', async ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      nickName: 'JohnnyD',
    }

    await useCase.execute(userData)

    const savedUser = await userRepository.findByEmail('john@example.com')
    const savedPlayer = await playerRepository.findByUserUuid(savedUser!.uuid)

    assert.exists(savedUser)
    assert.exists(savedPlayer)
    assert.equal(savedPlayer!.userUuid, savedUser!.uuid)
  })

  test('should handle repository save errors', async ({ assert }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      nickName: 'JohnnyD',
    }

    // Create a mock repository that throws error
    const errorRepository = {
      ...userRepository,
      save: async () => { throw new Error('Database error') }
    }
    
    const errorUseCase = new RegisterUserUseCase(errorRepository as any, playerRepository)
    const result = await errorUseCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Database error')
  })
})
