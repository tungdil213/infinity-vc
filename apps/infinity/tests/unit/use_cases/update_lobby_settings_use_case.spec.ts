import { test } from '@japa/runner'
import { UpdateLobbySettingsUseCase } from '../../../app/application/use_cases/update_lobby_settings_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'

// Mock repositories
const mockLobbyRepository = {
  findByUuidOrFail: async (uuid: string) => {
    if (uuid === 'lobby-123') {
      const lobbyDto = LobbyFactory.lobbyDto({ 
        uuid: 'lobby-123',
        createdBy: 'user-123',
        name: 'Original Lobby',
        maxPlayers: 4,
        isPrivate: false,
        status: 'OPEN',
        playerCount: 2
      })
      return {
        ...lobbyDto,
        serialize: () => lobbyDto,
      }
    }
    if (uuid === 'lobby-in-progress') {
      return {
        ...LobbyFactory.lobbyDto({ 
          uuid: 'lobby-in-progress',
          createdBy: 'user-123',
          status: 'IN_PROGRESS'
        }),
        serialize: () => LobbyFactory.lobbyDto()
      }
    }
    throw new Error('Lobby not found')
  },
  save: async () => {},
  // Add missing methods to satisfy LobbyRepository interface
  findByStatus: async () => [],
  findAvailableLobbies: async () => [],
  findByCreator: async () => [],
  findByPlayer: async () => null,
  findActiveLobbies: async () => [],
  countActiveLobbies: async () => 0,
  findByUuid: async () => null,
  delete: async () => {},
}

const mockDomainEventPublisher = {
  publishEvents: async () => {},
}

test.group('UpdateLobbySettingsUseCase', () => {
  const useCase = new UpdateLobbySettingsUseCase(
    mockLobbyRepository as any,
    mockDomainEventPublisher as any
  )

  test('should successfully update lobby name', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: {
        name: 'Updated Lobby Name',
      },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
    assert.exists(result.value.lobbyState)
  })

  test('should successfully update max players', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: {
        maxPlayers: 6,
      },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
  })

  test('should successfully update privacy setting', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: {
        isPrivate: true,
      },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
  })

  test('should update multiple settings at once', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: {
        name: 'New Name',
        maxPlayers: 8,
        isPrivate: true,
      },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
  })

  test('should fail when lobby UUID is missing', async ({ assert }) => {
    const request = {
      lobbyUuid: '',
      updaterUuid: 'user-123',
      settings: { name: 'New Name' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID and updater UUID are required')
  })

  test('should fail when updater UUID is missing', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: '',
      settings: { name: 'New Name' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID and updater UUID are required')
  })

  test('should fail when no settings provided', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: {},
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'At least one setting must be provided')
  })

  test('should fail when lobby not found', async ({ assert }) => {
    const request = {
      lobbyUuid: 'non-existent',
      updaterUuid: 'user-123',
      settings: { name: 'New Name' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Failed to update lobby settings: Lobby not found')
  })

  test('should fail when user is not lobby creator', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-456', // Different user
      settings: { name: 'New Name' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Only the lobby creator can update settings')
  })

  test('should fail when lobby is in progress', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-in-progress',
      updaterUuid: 'user-123',
      settings: { name: 'New Name' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Cannot update settings during a game')
  })

  test('should fail when name is empty', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: { name: '   ' },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby name cannot be empty')
  })

  test('should fail when name is too long', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: { name: 'A'.repeat(51) },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby name cannot exceed 50 characters')
  })

  test('should fail when max players is too low', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: { maxPlayers: 1 },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Max players must be between 2 and 8')
  })

  test('should fail when max players is too high', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: { maxPlayers: 10 },
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Max players must be between 2 and 8')
  })

  test('should fail when reducing max players below current count', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      updaterUuid: 'user-123',
      settings: { maxPlayers: 1 }, // Current count is 2
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Max players must be between 2 and 8')
  })
})
