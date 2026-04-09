import { test } from '@japa/runner'
import { RegisterUserUseCase } from '../../../app/application/use_cases/register_user_use_case.js'
import { InMemoryUserRepository } from '../../../app/infrastructure/repositories/in_memory_user_repository.js'
import { InMemoryPlayerRepository } from '../../../app/infrastructure/repositories/in_memory_player_repository.js'
import User from '../../../app/domain/entities/user.js'
import Player from '../../../app/domain/entities/player.js'

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
      password: 'password123',
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
      password: 'password123',
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

  test('should sanitize generated nickname from full name when no nickname is provided', async ({
    assert,
  }) => {
    const userData = {
      firstName: 'eric.monnier',
      lastName: '',
      username: 'eric_monnier',
      email: 'eric@example.com',
      password: 'password123',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isSuccess)
    assert.equal(result.value!.player.nickName, 'eric monnier')
  })

  test('should fallback to username when generated nickname becomes too short after sanitization', async ({
    assert,
  }) => {
    const userData = {
      firstName: '!!',
      lastName: '@@',
      username: 'valid_fallback_user',
      email: 'fallback@example.com',
      password: 'password123',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isSuccess)
    assert.equal(result.value!.player.nickName, 'valid_fallback_user')
  })

  test('should check uniqueness against sanitized generated nickname', async ({ assert }) => {
    const existingUser = User.create({
      firstName: 'Existing',
      lastName: 'User',
      username: 'existingnicknameowner',
      email: 'existing-nickname@example.com',
      password: 'password123',
    })
    await userRepository.save(existingUser)
    await playerRepository.save(
      Player.create({
        userUuid: existingUser.uuid,
        nickName: 'eric monnier',
      })
    )

    const userData = {
      firstName: 'eric.monnier',
      lastName: '',
      username: 'eric_monnier_2',
      email: 'eric2@example.com',
      password: 'password123',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'This name combination is already taken as a nickname')
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

  test('should fail fast when explicit nickname contains forbidden characters', async ({
    assert,
  }) => {
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe2',
      email: 'john2@example.com',
      password: 'password123',
      nickName: 'john.doe',
    }

    const result = await useCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(
      result.error,
      'Nickname can only contain letters, numbers, spaces, underscores and hyphens'
    )
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
      existsByEmail: async () => false,
      existsByUsername: async () => false,
      save: async () => {
        throw new Error('Database error')
      },
    }

    const errorPlayerRepository = {
      existsByNickName: async () => false,
      save: async () => Promise.resolve(),
    }

    const errorUseCase = new RegisterUserUseCase(
      errorRepository as any,
      errorPlayerRepository as any
    )
    const result = await errorUseCase.execute(userData)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Database error')
  })
})
