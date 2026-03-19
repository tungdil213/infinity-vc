import { test } from '@japa/runner'
import { LobbyStatus } from '../../../app/domain/value_objects/lobby_status.js'
import { CloseLobbyUseCase } from '../../../app/application/use_cases/close_lobby_use_case.js'

test.group('CloseLobbyUseCase', () => {
  test('should close a lobby and emit deletion event', async ({ assert }) => {
    let deletedLobbyUuid: string | null = null
    let emitted: { lobbyUuid: string; reason: string } | null = null
    let moderationAudit: {
      lobbyUuid: string
      reason: string
      closedByUserUuid: string
      closedByRole: string
    } | null = null

    const useCase = new CloseLobbyUseCase(
      {
        findByUuid: async (uuid: string) => ({
          uuid,
          status: LobbyStatus.WAITING,
        }),
        delete: async (uuid: string) => {
          deletedLobbyUuid = uuid
        },
      } as any,
      {
        emitLobbyDeleted: async (lobbyUuid: string, reason: string) => {
          emitted = { lobbyUuid, reason }
        },
        emitLobbyModerationClosed: async (payload: {
          lobbyUuid: string
          reason: string
          closedByUserUuid: string
          closedByRole: string
        }) => {
          moderationAudit = payload
        },
      } as any
    )

    const result = await useCase.execute({
      lobbyUuid: 'lobby-1',
      closedByUserUuid: 'moderator-1',
      closedByRole: 'MODERATOR',
      reason: 'manual moderation cleanup',
    })

    assert.isTrue(result.isSuccess)
    assert.equal(result.value.lobbyUuid, 'lobby-1')
    assert.equal(deletedLobbyUuid, 'lobby-1')
    assert.deepEqual(emitted, {
      lobbyUuid: 'lobby-1',
      reason: 'manual moderation cleanup',
    })
    assert.deepEqual(moderationAudit, {
      lobbyUuid: 'lobby-1',
      reason: 'manual moderation cleanup',
      closedByUserUuid: 'moderator-1',
      closedByRole: 'MODERATOR',
    })
  })

  test('should fail when lobbyUuid is missing', async ({ assert }) => {
    const useCase = new CloseLobbyUseCase({} as any, {} as any)

    const result = await useCase.execute({
      lobbyUuid: '',
      closedByUserUuid: 'moderator-1',
    })

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Lobby UUID is required')
  })

  test('should fail when closer user UUID is missing', async ({ assert }) => {
    const useCase = new CloseLobbyUseCase({} as any, {} as any)

    const result = await useCase.execute({
      lobbyUuid: 'lobby-1',
      closedByUserUuid: '',
    })

    assert.isTrue(result.isFailure)
    assert.include(result.error, 'Closer user UUID is required')
  })

  test('should fail when lobby is not found', async ({ assert }) => {
    const useCase = new CloseLobbyUseCase(
      {
        findByUuid: async (_uuid: string) => null,
      } as any,
      {} as any
    )

    const result = await useCase.execute({
      lobbyUuid: 'missing-lobby',
      closedByUserUuid: 'moderator-1',
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Lobby not found')
  })

  test('should fail when lobby is starting', async ({ assert }) => {
    const useCase = new CloseLobbyUseCase(
      {
        findByUuid: async (_uuid: string) => ({
          uuid: 'lobby-starting',
          status: LobbyStatus.STARTING,
        }),
      } as any,
      {} as any
    )

    const result = await useCase.execute({
      lobbyUuid: 'lobby-starting',
      closedByUserUuid: 'moderator-1',
    })

    assert.isTrue(result.isFailure)
    assert.equal(result.error, 'Cannot close a lobby while a game is starting')
  })

  test('should generate a default moderation reason when not provided', async ({ assert }) => {
    let emittedReason: string | null = null

    const useCase = new CloseLobbyUseCase(
      {
        findByUuid: async (uuid: string) => ({
          uuid,
          status: LobbyStatus.READY,
        }),
        delete: async (_uuid: string) => {},
      } as any,
      {
        emitLobbyDeleted: async (_lobbyUuid: string, reason: string) => {
          emittedReason = reason
        },
        emitLobbyModerationClosed: async () => {},
      } as any
    )

    const result = await useCase.execute({
      lobbyUuid: 'lobby-2',
      closedByUserUuid: 'moderator-42',
    })

    assert.isTrue(result.isSuccess)
    assert.equal(emittedReason, 'closed_by_moderation:moderator-42')
  })
})
