import { test } from '@japa/runner'
import { LeaveLobbyUseCase } from '../../../app/application/use_cases/leave_lobby_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'

// Mock repositories
const mockLobbyRepository = {
  save: async (_lobby: any) => Promise.resolve(),
  delete: async (_uuid: string) => Promise.resolve(),
  findByPlayer: async (_playerUuid: string) => null,
  findByUuid: async (_uuid: string) => null,
  findByUuidOrFail: async (uuid: string) => {
    const lobbyDto = LobbyFactory.lobbyDto({ uuid: uuid })
    return {
      uuid: lobbyDto.uuid,
      name: lobbyDto.name,
      status: 'waiting',
      maxPlayers: lobbyDto.maxPlayers,
      isPrivate: lobbyDto.isPrivate,
      createdBy: lobbyDto.createdBy,
      players: [
        { uuid: 'user-123', nickName: 'Player 1' },
        { uuid: 'user-456', nickName: 'Player 2' },
      ],
      playerCount: 2,
      hasAvailableSlots: true,
      canStart: true,
      availableActions: ['start', 'leave'],
      createdAt: new Date(),
      hasPlayer: (playerUuid: string) => playerUuid === 'user-123' || playerUuid === 'user-456',
      removePlayer: (playerUuid: string) => {
        if (playerUuid === 'user-123' || playerUuid === 'user-456') {
          return { success: true }
        }
        return { success: false, error: 'Player not found in lobby' }
      },
    }
  },
}

test.group('LeaveLobbyUseCase', (group) => {
  let leaveLobbyUseCase: LeaveLobbyUseCase

  group.setup(() => {
    leaveLobbyUseCase = new LeaveLobbyUseCase(mockLobbyRepository as any)
  })

  test('should successfully leave a lobby', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await leaveLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.uuid, 'lobby-456')
    assert.isFalse(result.value.lobbyDeleted)
  })

  test('should fail when userUuid is empty', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: '',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await leaveLobbyUseCase.execute(request)

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
    const result = await leaveLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby UUID is required')
  })

  test('should fail when player is not in the lobby', async ({ assert }) => {
    // Arrange
    const mockLobbyWithoutPlayer = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => ({
        uuid: 'lobby-456',
        name: 'Test Lobby',
        status: 'waiting',
        maxPlayers: 4,
        isPrivate: false,
        createdBy: 'creator-123',
        players: [{ uuid: 'other-user', nickName: 'Other Player' }],
        playerCount: 1,
        hasAvailableSlots: true,
        canStart: false,
        availableActions: ['leave'],
        createdAt: new Date(),
        hasPlayer: (_playerUuid: string) => false,
        removePlayer: (_playerUuid: string) => ({ success: false, error: 'Player not found' }),
      }),
    }

    const useCase = new LeaveLobbyUseCase(mockLobbyWithoutPlayer as any)

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Player is not in this lobby')
  })

  test('should delete lobby when last player leaves', async ({ assert }) => {
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
        players: [{ uuid: 'user-123', nickName: 'Last Player' }],
        playerCount: 0, // After removal
        hasAvailableSlots: true,
        canStart: false,
        availableActions: [],
        createdAt: new Date(),
        hasPlayer: (playerUuid: string) => playerUuid === 'user-123',
        removePlayer: (_playerUuid: string) => ({ success: true }),
      }),
    }

    const useCase = new LeaveLobbyUseCase(mockLobbyWithOnePlayer as any)

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.lobbyDeleted)
    assert.equal(result.value.lobby.currentPlayers, 0)
  })

  test('should handle remove player failure', async ({ assert }) => {
    // Arrange
    const mockLobbyWithRemoveFailure = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => ({
        uuid: 'lobby-456',
        name: 'Test Lobby',
        status: 'waiting',
        maxPlayers: 4,
        isPrivate: false,
        createdBy: 'creator-123',
        players: [{ uuid: 'user-123', nickName: 'Player' }],
        playerCount: 1,
        hasAvailableSlots: true,
        canStart: false,
        availableActions: ['leave'],
        createdAt: new Date(),
        hasPlayer: (_playerUuid: string) => true,
        removePlayer: (_playerUuid: string) => ({ success: false, error: 'Cannot remove player' }),
      }),
    }

    const useCase = new LeaveLobbyUseCase(mockLobbyWithRemoveFailure as any)

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Cannot remove player')
  })

  test('should handle lobby not found error', async ({ assert }) => {
    // Arrange
    const mockLobbyRepositoryNotFound = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => {
        throw new Error('Lobby not found')
      },
    }

    const useCase = new LeaveLobbyUseCase(mockLobbyRepositoryNotFound as any)

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'non-existent-lobby',
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'System error')
  })
})
