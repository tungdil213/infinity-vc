import { test } from '@japa/runner'
import { JoinLobbyUseCase } from '../../../app/application/use_cases/join_lobby_use_case.js'
import { LobbyNotificationService } from '../../../app/application/services/lobby_notification_service.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'
import { UserFactory } from '../../factories/user_factory.js'

// Mock repositories
const mockPlayerRepository = {
  findPlayerInterfaceByUuidOrFail: async (uuid: string) => {
    const userDto = UserFactory.userDto({ userUuid: uuid })
    return {
      uuid: userDto.userUuid,
      nickName: userDto.fullName,
      email: userDto.email
    }
  }
}

// Mock notification service
const mockNotificationService = {
  notifyPlayerJoined: () => {},
  notifyPlayerLeft: () => {},
  notifyStatusChanged: () => {},
  notifyGameStarted: () => {},
  notifyLobbyDeleted: () => {},
  addListener: () => () => {},
  addLobbyListener: () => () => {},
  removeListener: () => {},
  removeLobbyListener: () => {}
}

const mockLobbyRepository = {
  save: async (_lobby: any) => Promise.resolve(),
  delete: async (_uuid: string) => Promise.resolve(),
  findByPlayer: async (_playerUuid: string) => null,
  findByUuid: async (_uuid: string) => null,
  findByUuidOrFail: async (uuid: string) => {
    const lobbyDto = LobbyFactory.lobbyDto({ lobbyUuid: uuid })
    return {
      uuid: lobbyDto.lobbyUuid,
      name: lobbyDto.name,
      status: 'waiting',
      maxPlayers: lobbyDto.maxPlayers,
      isPrivate: lobbyDto.isPrivate,
      createdBy: lobbyDto.creator,
      players: [],
      hasAvailableSlots: true,
      canStart: false,
      availableActions: ['start', 'leave'],
      createdAt: new Date(),
      addPlayer: (player: any) => {
        // Mock implementation returning Result pattern
        return { isFailure: false, isSuccess: true }
      },
      creator: { uuid: 'creator-123', nickName: 'Creator' }
    }
  }
}

test.group('JoinLobbyUseCase', (group) => {
  let joinLobbyUseCase: JoinLobbyUseCase

  group.setup(() => {
    joinLobbyUseCase = new JoinLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepository as any,
      mockNotificationService as any
    )
  })

  test('should successfully join a lobby', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456'
    }

    // Act
    const result = await joinLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.uuid, 'lobby-456')
    assert.equal(result.value.lobby.status, 'waiting')
    assert.isTrue(result.value.lobby.hasAvailableSlots)
  })

  test('should fail when userUuid is empty', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: '',
      lobbyUuid: 'lobby-456'
    }

    // Act
    const result = await joinLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'User UUID is required')
  })

  test('should fail when lobbyUuid is empty', async ({ assert }) => {
    // Arrange
    const request = {
      userUuid: 'user-123',
      lobbyUuid: ''
    }

    // Act
    const result = await joinLobbyUseCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby UUID is required')
  })

  test('should fail when player is already in a lobby', async ({ assert }) => {
    // Arrange
    const existingLobby = {
      uuid: 'existing-lobby',
      name: 'Existing Lobby',
      players: [{ uuid: 'user-123', nickName: 'Player' }]
    }

    const mockLobbyRepositoryWithExisting = {
      ...mockLobbyRepository,
      findByPlayer: async (_playerUuid: string) => existingLobby
    }

    const useCase = new JoinLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepositoryWithExisting as any,
      mockNotificationService as any
    )

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456'
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Player is already in a lobby')
  })

  test('should fail when lobby is full', async ({ assert }) => {
    // Arrange
    const fullLobby = {
      uuid: 'lobby-456',
      name: 'Full Lobby',
      status: 'waiting',
      maxPlayers: 2,
      isPrivate: false,
      createdBy: 'creator-123',
      players: [
        { uuid: 'player-1', nickName: 'Player 1' },
        { uuid: 'player-2', nickName: 'Player 2' }
      ],
      hasAvailableSlots: false,
      canStart: true,
      availableActions: ['start'],
      createdAt: new Date(),
      addPlayer: (_player: any) => {
        throw new Error('Lobby is full')
      }
    }

    const mockLobbyRepositoryWithFull = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => fullLobby
    }

    const useCase = new JoinLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepositoryWithFull as any,
      mockNotificationService as any
    )

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'lobby-456'
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby is full')
  })

  test('should handle player not found error', async ({ assert }) => {
    // Arrange
    const mockPlayerRepositoryNotFound = {
      findPlayerInterfaceByUuidOrFail: async (_uuid: string) => null
    }

    const useCase = new JoinLobbyUseCase(
      mockPlayerRepositoryNotFound as any,
      mockLobbyRepository as any,
      mockNotificationService as any
    )

    const request = {
      userUuid: 'non-existent-user',
      lobbyUuid: 'lobby-456'
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Player not found')
  })

  test('should handle lobby not found error', async ({ assert }) => {
    // Arrange
    const mockLobbyRepositoryNotFound = {
      ...mockLobbyRepository,
      findByUuidOrFail: async (_uuid: string) => null
    }

    const useCase = new JoinLobbyUseCase(
      mockPlayerRepository as any,
      mockLobbyRepositoryNotFound as any,
      mockNotificationService as any
    )

    const request = {
      userUuid: 'user-123',
      lobbyUuid: 'non-existent-lobby'
    }

    // Act
    const result = await useCase.execute(request)

    // Assert
    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby not found')
  })
})
