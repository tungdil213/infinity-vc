import { test } from '@japa/runner'
import { TransferOwnershipUseCase } from '../../../app/application/use_cases/transfer_ownership_use_case.js'
import Lobby from '../../../app/domain/entities/lobby.js'

const LOBBY_UUID = '11111111-1111-4111-8111-111111111111'
const OWNER_UUID = '22222222-2222-4222-8222-222222222222'
const NEW_OWNER_UUID = '33333333-3333-4333-8333-333333333333'
const OUTSIDER_UUID = '44444444-4444-4444-8444-444444444444'

function createPlayer(uuid: string, nickName = `Player ${uuid}`) {
  return {
    uuid,
    nickName,
  }
}

function createLobby() {
  const lobby = Lobby.create({
    uuid: LOBBY_UUID,
    name: 'Transfer Lobby',
    creator: createPlayer(OWNER_UUID, 'Owner'),
    maxPlayers: 4,
  })
  lobby.addPlayer(createPlayer(NEW_OWNER_UUID, 'New Owner'))
  lobby.clearEvents()
  return lobby
}

function createUseCase(lobby: Lobby | null) {
  const savedLobbies: Lobby[] = []
  const publishedEvents: unknown[] = []

  const useCase = new TransferOwnershipUseCase(
    {
      findByUuid: async () => lobby,
      save: async (savedLobby: Lobby) => {
        savedLobbies.push(savedLobby)
      },
    } as any,
    {
      publishEvents: async (events: unknown[]) => {
        publishedEvents.push(...events)
      },
    } as any
  )

  return {
    useCase,
    savedLobbies,
    publishedEvents,
  }
}

test.group('TransferOwnershipUseCase', () => {
  test('transfers ownership to another player in the lobby', async ({ assert }) => {
    const lobby = createLobby()
    const { useCase, savedLobbies, publishedEvents } = createUseCase(lobby)

    const result = await useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
    })

    assert.isTrue(result.isSuccess)
    assert.deepEqual(result.value, {
      success: true,
      lobbyUuid: LOBBY_UUID,
      previousOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
      lobbyState: lobby.serialize(),
    })
    assert.equal(lobby.createdBy, NEW_OWNER_UUID)
    assert.deepEqual(savedLobbies, [lobby])
    assert.lengthOf(publishedEvents, 1)
    assert.equal((publishedEvents[0] as any).eventType, 'LobbyOwnerChanged')
    assert.deepEqual((publishedEvents[0] as any).payload, {
      lobbyUuid: LOBBY_UUID,
      previousOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
      transferredByUserUuid: OWNER_UUID,
    })
  })

  test('returns not found without saving or publishing', async ({ assert }) => {
    const { useCase, savedLobbies, publishedEvents } = createUseCase(null)

    const result = await useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
    assert.deepEqual(savedLobbies, [])
    assert.deepEqual(publishedEvents, [])
  })

  test('rejects non owner, self transfer and absent target', async ({ assert }) => {
    const nonOwnerResult = await createUseCase(createLobby()).useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: NEW_OWNER_UUID,
      newOwnerUuid: OWNER_UUID,
    })
    const selfResult = await createUseCase(createLobby()).useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: OWNER_UUID,
    })
    const absentResult = await createUseCase(createLobby()).useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: OUTSIDER_UUID,
    })

    assert.equal(nonOwnerResult.error, 'Only the lobby creator can transfer ownership')
    assert.equal(selfResult.error, 'Cannot transfer ownership to yourself')
    assert.equal(absentResult.error, 'Target player is not in this lobby')
  })

  test('rejects transfer while game is starting', async ({ assert }) => {
    const lobby = createLobby()
    lobby.setReady()
    lobby.startGame()
    const { useCase } = createUseCase(lobby)

    const result = await useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Cannot transfer ownership while a game is starting')
  })

  test('validates required identifiers', async ({ assert }) => {
    const { useCase } = createUseCase(createLobby())

    const missingLobby = await useCase.execute({
      lobbyUuid: '',
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: NEW_OWNER_UUID,
    })
    const missingOwner = await useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: '',
      newOwnerUuid: NEW_OWNER_UUID,
    })
    const missingNewOwner = await useCase.execute({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: OWNER_UUID,
      newOwnerUuid: '',
    })

    assert.equal(missingLobby.error, 'Lobby UUID is required')
    assert.equal(missingOwner.error, 'Current owner UUID is required')
    assert.equal(missingNewOwner.error, 'New owner UUID is required')
  })
})
