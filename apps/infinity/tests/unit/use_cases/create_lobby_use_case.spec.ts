import { test } from '@japa/runner'
import { CreateLobbyUseCase } from '../../../app/application/use_cases/create_lobby_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'
import { UserFactory } from '../../factories/user_factory.js'

// Mock repositories
const mockPlayerRepository = {
  findPlayerInterfaceByUuid: async (userUuid: string) => {
    const userDto = UserFactory.userDto({ userUuid })
    return {
      uuid: userDto.userUuid,
      nickName: userDto.fullName,
      email: userDto.email,
    }
  },
  findPlayerInterfaceByUuidOrFail: async (userUuid: string) => {
    const userDto = UserFactory.userDto({ userUuid })
    return {
      uuid: userDto.userUuid,
      nickName: userDto.fullName,
      email: userDto.email,
    }
  },
}

const mockLobbyRepository = {
  save: async (lobby: any) => lobby,
  findByCreatorUuid: async (_userUuid: string) => null,
  findByPlayer: async (_userUuid: string) => null,
  delete: async (_uuid: string) => true,
}

// Mock notification service
const mockNotificationService = {
  notifyLobbyCreated: () => {},
  notifyPlayerJoined: () => {},
  notifyPlayerLeft: () => {},
  notifyStatusChanged: () => {},
  notifyGameStarted: () => {},
  notifyLobbyDeleted: () => {},
  addListener: () => () => {},
  addLobbyListener: () => () => {},
}

test.group('CreateLobbyUseCase', (group) => {
  let createLobbyUseCase: CreateLobbyUseCase

  group.setup(() => {
    createLobbyUseCase = new CreateLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepository as any,
      mockNotificationService as any
    )
  })

  group.teardown(() => {
    LobbyFactory.resetCounter()
    UserFactory.resetCounter()
  })

  test('should create lobby successfully with valid data', async ({ assert }) => {
    // Arrange
    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'user-123',
      name: 'Test Lobby',
      maxPlayers: 4,
      isPrivate: false,
    })

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isDefined(result.value)
    assert.equal(result.value.name, 'Test Lobby')
    assert.equal(result.value.maxPlayers, 4)
    assert.equal(result.value.isPrivate, false)
    assert.equal(result.value.currentPlayers, 1)
    assert.equal(result.value.status, 'WAITING')
    assert.isTrue(result.value.hasAvailableSlots)
    assert.isFalse(result.value.canStart)
  })

  test('should fail with empty lobby name', async ({ assert }) => {
    // Arrange
    const request = LobbyFactory.createLobbyRequest({
      name: '',
      userUuid: 'user-123',
    })

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'name')
  })

  test('should fail with invalid max players (too low)', async ({ assert }) => {
    // Arrange
    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'user-123',
      maxPlayers: 1,
    })

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'maxPlayers')
  })

  test('should fail with invalid max players (too high)', async ({ assert }) => {
    // Arrange
    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'user-123',
      maxPlayers: 10,
    })

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'maxPlayers')
  })

  test('should remove player from existing lobby before creating new one', async ({ assert }) => {
    // Arrange
    const existingLobby = {
      uuid: 'existing-lobby',
      removePlayer: (_playerUuid: string) => ({ success: true }),
      playerCount: 0,
    }

    const mockLobbyRepositoryWithExisting = {
      ...mockLobbyRepository,
      findByPlayer: async (_playerUuid: string) => existingLobby,
      delete: async (uuid: string) => {
        assert.equal(uuid, 'existing-lobby')
        return Promise.resolve()
      },
    }

    const useCase = new CreateLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepositoryWithExisting as any,
      mockNotificationService as any
    )

    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'user-123',
    })

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
  })

  test('should handle player not found error', async ({ assert }) => {
    // Arrange
    const mockPlayerRepositoryNotFound = {
      findPlayerInterfaceByUuid: async (_uuid: string) => null,
    }

    const useCase = new CreateLobbyUseCase(
      mockPlayerRepositoryNotFound as any,
      mockLobbyRepository as any,
      mockNotificationService as any
    )

    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'non-existent-user',
    })

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Player not found')
  })

  test('should create private lobby correctly', async ({ assert }) => {
    // Arrange
    const request = LobbyFactory.createLobbyRequest({
      userUuid: 'user-123',
      isPrivate: true,
    })

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.isPrivate)
  })

  test('should use default values when optional parameters are not provided', async ({
    assert,
  }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      name: 'Test Lobby',
    }

    // Act
    const result = await createLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.maxPlayers, 4) // Default value
    assert.isFalse(result.value.isPrivate) // Default value
  })
})
