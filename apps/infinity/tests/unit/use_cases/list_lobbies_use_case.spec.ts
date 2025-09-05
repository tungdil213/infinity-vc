import { test } from '@japa/runner'
import { ListLobbiesUseCase } from '../../../app/application/use_cases/list_lobbies_use_case.js'
import { LobbyStatus } from '../../../app/domain/value_objects/lobby_status.js'
import { LobbyFactory } from '../../factories/lobby_factory.js'

// Mock repositories
const mockLobbyRepository = {
  findByStatus: async (status: LobbyStatus) => {
    const lobbies = [
      LobbyFactory.lobbyDto({ status: status }),
      LobbyFactory.lobbyDto({ status: status, isPrivate: true }),
    ]
    return lobbies
  },
  findAvailableLobbies: async () => {
    return [
      LobbyFactory.lobbyDto({ status: LobbyStatus.OPEN }),
      LobbyFactory.lobbyDto({ status: LobbyStatus.OPEN, isPrivate: true }),
      LobbyFactory.lobbyDto({ status: LobbyStatus.WAITING }),
    ]
  },
  // Add missing methods to satisfy LobbyRepository interface
  findByCreator: async () => [],
  findByPlayer: async () => null,
  findActiveLobbies: async () => [],
  countActiveLobbies: async () => 0,
  findByUuid: async () => null,
  findByUuidOrFail: async () => null,
  save: async () => {},
  delete: async () => {},
}

test.group('ListLobbiesUseCase', () => {
  const useCase = new ListLobbiesUseCase(mockLobbyRepository as any)

  test('should list all available lobbies by default', async ({ assert }) => {
    const result = await useCase.execute()

    assert.isTrue(result.isSuccess)
    // Par défaut, les lobbies privés sont filtrés, donc 2 lobbies publics sur 3
    assert.equal(result.value.lobbies.length, 2)
    assert.equal(result.value.total, 2)
    assert.exists(result.value.lobbies[0].uuid)
    assert.exists(result.value.lobbies[0].name)
    assert.exists(result.value.lobbies[0].status)
  })

  test('should filter lobbies by status', async ({ assert }) => {
    const result = await useCase.execute({ status: LobbyStatus.OPEN })

    assert.isTrue(result.isSuccess)
    // Par défaut, les lobbies privés sont filtrés, donc 1 lobby public sur 2
    assert.equal(result.value.lobbies.length, 1)
    assert.equal(result.value.total, 1)
    result.value.lobbies.forEach((lobby) => {
      assert.equal(lobby.status, LobbyStatus.OPEN)
    })
  })

  test('should filter out private lobbies by default', async ({ assert }) => {
    const result = await useCase.execute()

    assert.isTrue(result.isSuccess)
    const privateLobbies = result.value.lobbies.filter((lobby) => lobby.isPrivate)
    assert.equal(privateLobbies.length, 0)
  })

  test('should include private lobbies when requested', async ({ assert }) => {
    const result = await useCase.execute({ includePrivate: true })

    assert.isTrue(result.isSuccess)
    const privateLobbies = result.value.lobbies.filter((lobby) => lobby.isPrivate)
    assert.isAbove(privateLobbies.length, 0)
  })

  test('should filter lobbies with available slots', async ({ assert }) => {
    // Setup mock with specific slot availability
    mockLobbyRepository.findAvailableLobbies = async () => {
      return [
        LobbyFactory.lobbyDto({
          status: LobbyStatus.OPEN,
          currentPlayers: 2,
          maxPlayers: 4,
          hasAvailableSlots: true,
        }),
        LobbyFactory.lobbyDto({
          status: LobbyStatus.OPEN,
          currentPlayers: 4,
          maxPlayers: 4,
          hasAvailableSlots: false,
        }),
      ]
    }

    const result = await useCase.execute({ hasSlots: true })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobbies.length, 1)
    assert.isTrue(result.value.lobbies[0].hasAvailableSlots)
  })

  test('should return empty list when no lobbies match filters', async ({ assert }) => {
    mockLobbyRepository.findAvailableLobbies = async () => []

    const result = await useCase.execute()

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobbies.length, 0)
    assert.equal(result.value.total, 0)
  })

  test('should combine multiple filters correctly', async ({ assert }) => {
    mockLobbyRepository.findByStatus = async (_status: LobbyStatus) => {
      return [
        LobbyFactory.lobbyDto({
          status: LobbyStatus.OPEN,
          isPrivate: false,
          hasAvailableSlots: true,
        }),
        LobbyFactory.lobbyDto({
          status: LobbyStatus.OPEN,
          isPrivate: true,
          hasAvailableSlots: true,
        }),
        LobbyFactory.lobbyDto({
          status: LobbyStatus.OPEN,
          isPrivate: false,
          hasAvailableSlots: false,
        }),
      ]
    }

    const result = await useCase.execute({
      status: LobbyStatus.OPEN,
      hasSlots: true,
      includePrivate: false,
    })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobbies.length, 1)
    assert.equal(result.value.lobbies[0].status, LobbyStatus.OPEN)
    assert.isFalse(result.value.lobbies[0].isPrivate)
    assert.isTrue(result.value.lobbies[0].hasAvailableSlots)
  })

  test('should return correct lobby structure', async ({ assert }) => {
    // Setup mock to ensure we have lobbies
    mockLobbyRepository.findAvailableLobbies = async () => {
      return [LobbyFactory.lobbyDto({ status: LobbyStatus.OPEN })]
    }

    const result = await useCase.execute()

    assert.isTrue(result.isSuccess)
    assert.isTrue(result.value.lobbies.length > 0)
    const lobby = result.value.lobbies[0]

    console.log(lobby)

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
  })

  test('should handle repository errors gracefully', async ({ assert }) => {
    mockLobbyRepository.findAvailableLobbies = async () => {
      throw new Error('Database connection failed')
    }

    try {
      await useCase.execute()
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.exists(error)
    }
  })
})
