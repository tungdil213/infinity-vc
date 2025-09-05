import { test } from '@japa/runner'
import { StartGameUseCase } from '../../../app/application/use_cases/start_game_use_case.js'

// Mock repositories
const mockLobbyRepository = {
  save: async (_lobby: any) => Promise.resolve(),
  delete: async (_uuid: string) => Promise.resolve(),
  findByPlayer: async (_playerUuid: string) => null,
  findByUuid: async (_uuid: string) => null,
  findByUuidOrFail: async (_uuid: string) => {
    return {
      uuid: 'lobby-456',
      name: 'Test Lobby',
      status: 'waiting',
      maxPlayers: 4,
      isPrivate: false,
      createdBy: 'user-123', // Creator is the requesting user
      players: [
        { uuid: 'user-123', nickName: 'Creator' },
        { uuid: 'user-456', nickName: 'Player 2' },
      ],
      playerCount: 2,
      hasAvailableSlots: false,
      canStart: true,
      availableActions: ['start'],
      createdAt: new Date(),
      startGame: () => ({
        success: true,
        data: 'game-uuid-123',
      }),
    }
  },
}

const mockGameRepository = {
  save: async (_game: any) => Promise.resolve(),
  findByUuid: async (_uuid: string) => null,
  findByLobbyUuid: async (_lobbyUuid: string) => null,
}

test.group('StartGameUseCase', (group) => {
  let startGameUseCase: StartGameUseCase

  group.setup(() => {
    startGameUseCase = new StartGameUseCase(mockLobbyRepository as any, mockGameRepository as any)
  })

  test('should successfully start a game', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await startGameUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.game.status, 'IN_PROGRESS')
    assert.equal(result.value.game.players.length, 2)
    assert.isTrue(result.value.lobbyDeleted)
    assert.exists(result.value.game.startedAt)
  })

  test('should fail when userUuid is empty', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: '',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await startGameUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'User UUID is required')
  })

  test('should fail when lobbyUuid is empty', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      lobbyUuid: '',
    }

    // Act
    const result = await startGameUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby UUID is required')
  })

  test('should fail when user is not the lobby creator', async ({ assert }) => {
    // Arrange
    const mockLobbyWithDifferentCreator = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => ({
        uuid: 'lobby-456',
        name: 'Test Lobby',
        status: 'waiting',
        maxPlayers: 4,
        isPrivate: false,
        createdBy: 'different-user', // Different creator
        players: [
          { uuid: 'user-123', nickName: 'Player' },
          { uuid: 'different-user', nickName: 'Creator' },
        ],
        playerCount: 2,
        hasAvailableSlots: false,
        canStart: true,
        availableActions: ['start'],
        createdAt: new Date(),
      }),
    }

    const useCase = new StartGameUseCase(
      mockLobbyWithDifferentCreator as any,
      mockGameRepository as any
    )

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Only the lobby creator can start the game')
  })

  test('should fail when lobby has insufficient players', async ({ assert }) => {
    // Arrange
    const mockLobbyWithOnePlayer = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => ({
        uuid: 'lobby-456',
        name: 'Test Lobby',
        status: 'waiting',
        maxPlayers: 4,
        isPrivate: false,
        createdBy: 'user-123',
        players: [{ uuid: 'user-123', nickName: 'Creator' }],
        playerCount: 1,
        hasAvailableSlots: true,
        canStart: false,
        availableActions: [],
        createdAt: new Date(),
      }),
    }

    const useCase = new StartGameUseCase(mockLobbyWithOnePlayer as any, mockGameRepository as any)

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby is not ready to start a game')
  })

  test('should fail when requesting player is not in lobby', async ({ assert }) => {
    // Arrange
    const mockLobbyWithoutRequestingPlayer = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => ({
        uuid: 'lobby-456',
        name: 'Test Lobby',
        status: 'waiting',
        maxPlayers: 4,
        isPrivate: false,
        createdBy: 'other-user',
        players: [
          { uuid: 'other-user', nickName: 'Creator' },
          { uuid: 'user-456', nickName: 'Player 2' },
        ],
        playerCount: 2,
        hasAvailableSlots: false,
        canStart: true,
        availableActions: ['start'],
        createdAt: new Date(),
      }),
    }

    const useCase = new StartGameUseCase(
      mockLobbyWithoutRequestingPlayer as any,
      mockGameRepository as any
    )

    const request = {
      userUuid: 'user-123', // Not in the lobby
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Only the lobby creator can start the game')
  })

  test('should handle lobby not found error', async ({ assert }) => {
    // Arrange
    const mockLobbyRepositoryNotFound = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => {
        throw new Error('Lobby not found')
      },
    }

    const useCase = new StartGameUseCase(
      mockLobbyRepositoryNotFound as any,
      mockGameRepository as any
    )

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'non-existent-lobby',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby not found')
  })
})
