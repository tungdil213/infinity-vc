import { test } from '@japa/runner'
import { ShowLobbyUseCase } from '../../../app/application/use_cases/show_lobby_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'
import { PlayerFactory } from '../../../app/tests/factories/player_factory.js'

test.group('ShowLobbyUseCase', () => {
  let useCase: ShowLobbyUseCase
  let mockLobbyRepository: any

  test.group.setup(() => {
    const mockLobby = LobbyFactory.lobby({
      uuid: 'lobby-123',
      name: 'Test Lobby',
      isPrivate: false,
      players: [
        PlayerFactory.player({ uuid: 'player-1', nickName: 'Player 1' }),
        PlayerFactory.player({ uuid: 'player-2', nickName: 'Player 2' }),
      ],
    })

    mockLobbyRepository = {
      findByUuidOrFail: async (uuid: string) => {
        if (uuid === 'lobby-123') {
          return mockLobby
        }
        throw new Error('Lobby not found')
      },
    }

    useCase = new ShowLobbyUseCase(mockLobbyRepository)
  })

  test('should return lobby details for valid UUID', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.uuid, 'lobby-123')
    assert.equal(result.value.name, 'Test Lobby')
    assert.isFalse(result.value.isPrivate)
    assert.equal(result.value.players.length, 2)
    assert.exists(result.value.createdAt)
  })

  test('should return correct lobby structure', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    const lobby = result.value

    assert.exists(lobby.uuid)
    assert.exists(lobby.name)
    assert.exists(lobby.status)
    assert.isNumber(lobby.currentPlayers)
    assert.isNumber(lobby.maxPlayers)
    assert.isBoolean(lobby.isPrivate)
    assert.isBoolean(lobby.hasAvailableSlots)
    assert.isBoolean(lobby.canStart)
    assert.exists(lobby.createdBy)
    assert.isArray(lobby.players)
    assert.instanceOf(lobby.createdAt, Date)
    assert.isArray(lobby.availableActions)
  })

  test('should include player details in response', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    const players = result.value.players

    assert.equal(players.length, 2)
    assert.exists(players[0].uuid)
    assert.exists(players[0].nickName)
    assert.equal(players[0].nickName, 'Player 1')
    assert.equal(players[1].nickName, 'Player 2')
  })

  test('should fail for non-existent lobby', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'non-existent' })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail for invalid UUID format', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: '' })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID is required')
  })

  test('should fail for null UUID', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: null as any })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID is required')
  })

  test('should fail for undefined UUID', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: undefined as any })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby UUID is required')
  })

  test('should handle private lobby access', async ({ assert }) => {
    const privateLobby = LobbyFactory.lobby({
      uuid: 'private-lobby',
      isPrivate: true,
    })

    mockLobbyRepository.findByUuidOrFail = async (uuid: string) => {
      if (uuid === 'private-lobby') {
        return privateLobby
      }
      throw new Error('Lobby not found')
    }

    const result = await useCase.execute({ lobbyUuid: 'private-lobby' })

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.isPrivate)
  })

  test('should handle repository errors gracefully', async ({ assert }) => {
    mockLobbyRepository.findByUuidOrFail = async (_uuid: string) => {
      throw new Error('Database connection failed')
    }

    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Database connection failed')
  })

  test('should serialize lobby data correctly', async ({ assert }) => {
    const mockLobbyWithSerialize = {
      ...LobbyFactory.lobby({ uuid: 'lobby-123' }),
      serialize: () => ({
        uuid: 'lobby-123',
        name: 'Serialized Lobby',
        status: 'OPEN',
        currentPlayers: 1,
        maxPlayers: 4,
        isPrivate: false,
        hasAvailableSlots: true,
        canStart: false,
        createdBy: 'user-1',
        players: [],
        createdAt: new Date(),
        availableActions: ['join', 'leave'],
      }),
    }

    mockLobbyRepository.findByUuidOrFail = async (_uuid: string) => {
      return mockLobbyWithSerialize
    }

    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.name, 'Serialized Lobby')
    assert.equal(result.value.status, 'OPEN')
  })

  test('should handle lobby with no players', async ({ assert }) => {
    const emptyLobby = LobbyFactory.lobby({
      uuid: 'empty-lobby',
      players: [],
    })

    mockLobbyRepository.findByUuidOrFail = async (_uuid: string) => {
      return emptyLobby
    }

    const result = await useCase.execute({ lobbyUuid: 'empty-lobby' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.players.length, 0)
    assert.equal(result.value.currentPlayers, 0)
  })

  test('should handle lobby at max capacity', async ({ assert }) => {
    const fullLobby = LobbyFactory.lobby({
      uuid: 'full-lobby',
      maxPlayers: 2,
      playerCount: 2,
      hasAvailableSlots: false,
      players: [
        PlayerFactory.player({ uuid: 'player-1' }),
        PlayerFactory.player({ uuid: 'player-2' }),
      ],
    })

    mockLobbyRepository.findByUuidOrFail = async (_uuid: string) => {
      return fullLobby
    }

    const result = await useCase.execute({ lobbyUuid: 'full-lobby' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.currentPlayers, 2)
    assert.equal(result.value.maxPlayers, 2)
    assert.isFalse(result.value.hasAvailableSlots)
  })
})
