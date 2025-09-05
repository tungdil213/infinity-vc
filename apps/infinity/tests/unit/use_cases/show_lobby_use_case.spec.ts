import { test } from '@japa/runner'
import { ShowLobbyUseCase } from '../../../app/application/use_cases/show_lobby_use_case.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'

// Mock setup
const mockLobby = LobbyFactory.lobbyDto({
  uuid: 'lobby-123',
  name: 'Test Lobby',
  isPrivate: false,
  players: [
    LobbyFactory.playerDto({ uuid: 'player-1', nickName: 'Player 1' }),
    LobbyFactory.playerDto({ uuid: 'player-2', nickName: 'Player 2' }),
  ],
})

const mockLobbyRepository: any = {
  findByUuid: async (uuid: string) => {
    if (uuid === 'lobby-123') {
      return mockLobby
    }
    return null
  },
}

const useCase = new ShowLobbyUseCase(mockLobbyRepository)

test.group('ShowLobbyUseCase', () => {
  test('should return lobby details for valid UUID', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.uuid, 'lobby-123')
    assert.equal(result.value.lobby.name, 'Test Lobby')
    assert.isFalse(result.value.lobby.isPrivate)
    assert.equal(result.value.lobby.players.length, 2)
    assert.exists(result.value.lobby.createdAt)
  })

  test('should return correct lobby structure', async ({ assert }) => {
    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    const lobby = result.value.lobby

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
    const players = result.value.lobby.players

    assert.equal(players.length, 2)
    assert.exists(players[0].uuid)
    assert.exists(players[0].nickName)
    assert.equal(players[0].uuid, 'player-1')
    assert.equal(players[0].nickName, 'Player 1')
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
    const privateLobby = LobbyFactory.lobbyDto({
      uuid: 'private-lobby',
      isPrivate: true,
    })

    mockLobbyRepository.findByUuid = async (uuid: string) => {
      if (uuid === 'private-lobby') {
        return privateLobby
      }
      return null
    }

    const result = await useCase.execute({ lobbyUuid: 'private-lobby' })

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.lobby.isPrivate)
  })

  test('should handle repository errors gracefully', async ({ assert }) => {
    mockLobbyRepository.findByUuid = async (_uuid: string) => {
      throw new Error('Database connection failed')
    }

    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'System error: Database connection failed')
  })

  test('should serialize lobby data correctly', async ({ assert }) => {
    const mockLobbyWithSerialize = LobbyFactory.lobbyDto({
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
      availableActions: ['join'],
    })

    mockLobbyRepository.findByUuid = async (_uuid: string) => {
      return mockLobbyWithSerialize
    }

    const result = await useCase.execute({ lobbyUuid: 'lobby-123' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.name, 'Serialized Lobby')
    assert.equal(result.value.lobby.status, 'OPEN')
  })

  test('should handle lobby with no players', async ({ assert }) => {
    const emptyLobby = LobbyFactory.lobbyDto({
      uuid: 'empty-lobby',
      players: [],
      currentPlayers: 0,
    })

    mockLobbyRepository.findByUuid = async (_uuid: string) => {
      return emptyLobby
    }

    const result = await useCase.execute({ lobbyUuid: 'empty-lobby' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.players.length, 0)
    assert.equal(result.value.lobby.currentPlayers, 0)
  })

  test('should handle lobby at max capacity', async ({ assert }) => {
    const fullLobby = LobbyFactory.lobbyDto({
      uuid: 'full-lobby',
      maxPlayers: 2,
      currentPlayers: 2,
      hasAvailableSlots: false,
      players: [
        LobbyFactory.playerDto({ uuid: 'player-1' }),
        LobbyFactory.playerDto({ uuid: 'player-2' }),
      ],
    })

    mockLobbyRepository.findByUuid = async (_uuid: string) => {
      return fullLobby
    }

    const result = await useCase.execute({ lobbyUuid: 'full-lobby' })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobby.currentPlayers, 2)
    assert.equal(result.value.lobby.maxPlayers, 2)
    assert.isFalse(result.value.lobby.hasAvailableSlots)
  })
})
