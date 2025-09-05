import { test } from '@japa/runner'
import { SetPlayerReadyUseCase } from '../../../app/application/use_cases/set_player_ready_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'

// Mock repositories
const mockLobbyRepository = {
  findByUuidOrFail: async (uuid: string) => {
    if (uuid === 'lobby-123') {
      const lobbyDto = LobbyFactory.lobbyDto({
        uuid: 'lobby-123',
        status: 'OPEN',
        currentPlayers: 2,
      })
      return {
        ...lobbyDto,
        hasPlayer: (playerUuid: string) => playerUuid === 'player-123',
        setPlayerReady: (_playerUuid: string, _isReady: boolean) => {
          // Mock implementation
          return { success: true }
        },
        areAllPlayersReady: () => false,
        serialize: () => lobbyDto,
      }
    }
    if (uuid === 'lobby-in-progress') {
      return {
        ...LobbyFactory.lobbyDto({ status: 'IN_PROGRESS' }),
        hasPlayer: () => true,
        setPlayerReady: () => ({ success: true }),
        areAllPlayersReady: () => false,
        serialize: () => LobbyFactory.lobbyDto(),
      }
    }
    if (uuid === 'lobby-starting') {
      return {
        ...LobbyFactory.lobbyDto({ status: 'STARTING' }),
        hasPlayer: () => true,
        setPlayerReady: () => ({ success: true }),
        areAllPlayersReady: () => true,
        serialize: () => LobbyFactory.lobbyDto({ status: 'READY' }),
      }
    }
    if (uuid === 'lobby-all-ready') {
      return {
        ...LobbyFactory.lobbyDto({
          uuid: 'lobby-all-ready',
          status: 'READY',
          currentPlayers: 3,
        }),
        hasPlayer: () => true,
        setPlayerReady: () => ({ success: true }),
        areAllPlayersReady: () => true,
        serialize: () => LobbyFactory.lobbyDto(),
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

const mockPlayerRepository = {
  findByUuid: async (uuid: string) => {
    if (uuid === 'player-123') {
      return { uuid: 'player-123', nickName: 'Test Player' }
    }
    return null
  },
  // Add missing methods
  findPlayerInterfaceByUuid: async () => null,
  findPlayerInterfaceByUuidOrFail: async () => null,
}

const mockDomainEventPublisher = {
  publishEvents: async () => {},
}

test.group('SetPlayerReadyUseCase', () => {
  const useCase = new SetPlayerReadyUseCase(
    mockLobbyRepository as any,
    mockPlayerRepository as any,
    mockDomainEventPublisher as any
  )

  test('should successfully set player as ready', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      playerUuid: 'player-123',
      isReady: true,
    }

    const result = await useCase.execute(request)

    if (result.isFailure) {
      console.log('Test failed with error:', result.error)
    }

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
    assert.isTrue(result.value.allPlayersReady) // Avec 2 joueurs et isReady=true
    assert.isTrue(result.value.canStartGame) // Le jeu peut démarrer
    assert.exists(result.value.lobbyState)
  })

  test('should successfully set player as not ready', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      playerUuid: 'player-123',
      isReady: false,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
    assert.isFalse(result.value.allPlayersReady)
    assert.isFalse(result.value.canStartGame)
  })

  test('should detect when all players are ready and can start', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-all-ready',
      playerUuid: 'player-123',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.success)
    assert.isTrue(result.value.allPlayersReady)
    assert.isTrue(result.value.canStartGame)
  })

  test('should fail when lobby UUID is missing', async ({ assert }) => {
    const request = {
      lobbyUuid: '',
      playerUuid: 'player-123',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID and player UUID are required')
  })

  test('should fail when player UUID is missing', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      playerUuid: '',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID and player UUID are required')
  })

  test('should fail when lobby not found', async ({ assert }) => {
    const request = {
      lobbyUuid: 'non-existent',
      playerUuid: 'player-123',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Failed to set player ready status: Lobby not found')
  })

  test('should fail when lobby is starting', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-starting',
      playerUuid: 'player-123',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Game is already starting')
  })

  test('should fail when player is not in lobby', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      playerUuid: 'player-999', // Not in lobby
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Player is not in this lobby')
  })

  test('should fail when player not found', async ({ assert }) => {
    const request = {
      lobbyUuid: 'lobby-123',
      playerUuid: 'non-existent-player',
      isReady: true,
    }

    const result = await useCase.execute(request)

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Player is not in this lobby')
  })
})
