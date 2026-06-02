import { test } from '@japa/runner'
import { EnhancedLobbiesControllerActionsFlow } from '../../../../app/controllers/support/enhanced_lobbies_controller_actions.js'

const LOBBY_UUID = '11111111-1111-4111-8111-111111111111'
const USER_UUID = '22222222-2222-4222-8222-222222222222'
const TARGET_USER_UUID = '33333333-3333-4333-8333-333333333333'
const GAME_UUID = '44444444-4444-4444-8444-444444444444'

function createActionsFlow(overrides?: {
  startError?: string
  kickError?: string
  closeError?: string
  transferError?: string
}) {
  const startCalls: Array<Record<string, unknown>> = []
  const kickCalls: Array<Record<string, unknown>> = []
  const closeCalls: Array<Record<string, unknown>> = []
  const transferCalls: Array<Record<string, unknown>> = []

  const actionsFlow = new EnhancedLobbiesControllerActionsFlow(
    {
      async execute(payload: Record<string, unknown>) {
        startCalls.push(payload)

        if (overrides?.startError) {
          return {
            isFailure: true as const,
            error: overrides.startError,
          }
        }

        return {
          isFailure: false as const,
          value: {
            game: {
              uuid: GAME_UUID,
              status: 'in_progress',
            },
            lobbyDeleted: true,
          },
        }
      },
    } as any,
    {
      async execute(payload: Record<string, unknown>) {
        kickCalls.push(payload)

        if (overrides?.kickError) {
          return {
            isFailure: true as const,
            error: overrides.kickError,
          }
        }

        return {
          isFailure: false as const,
          value: {
            success: true,
            lobbyState: { uuid: payload.lobbyUuid },
          },
        }
      },
    } as any,
    {
      async execute(payload: Record<string, unknown>) {
        closeCalls.push(payload)

        if (overrides?.closeError) {
          return {
            isFailure: true as const,
            error: overrides.closeError,
          }
        }

        return {
          isFailure: false as const,
          value: {
            lobbyUuid: payload.lobbyUuid,
            reason: payload.reason ?? 'closed_by_moderation',
            closedAt: new Date('2026-04-11T12:30:00.000Z'),
          },
        }
      },
    } as any,
    {
      async execute(payload: Record<string, unknown>) {
        transferCalls.push(payload)

        if (overrides?.transferError) {
          return {
            isFailure: true as const,
            error: overrides.transferError,
          }
        }

        return {
          isFailure: false as const,
          value: {
            success: true,
            lobbyUuid: payload.lobbyUuid,
            previousOwnerUuid: payload.currentOwnerUuid,
            newOwnerUuid: payload.newOwnerUuid,
            lobbyState: { uuid: payload.lobbyUuid, createdBy: payload.newOwnerUuid },
          },
        }
      },
    } as any
  )

  return {
    actionsFlow,
    startCalls,
    kickCalls,
    closeCalls,
    transferCalls,
  }
}

test.group('enhanced_lobbies_controller_actions', () => {
  test('starts a game and exposes the game uuid for response mapping', async ({ assert }) => {
    const { actionsFlow, startCalls } = createActionsFlow()

    const result = await actionsFlow.start({
      lobbyUuid: LOBBY_UUID,
      userUuid: USER_UUID,
    })

    assert.equal(result.status, 'started')
    if (result.status !== 'started') return

    assert.equal(result.gameUuid, GAME_UUID)
    assert.equal(result.value.lobbyDeleted, true)
    assert.deepEqual(startCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
      },
    ])
  })

  test('returns start failures without a response payload', async ({ assert }) => {
    const { actionsFlow } = createActionsFlow({
      startError: 'Lobby is not ready to start a game',
    })

    const result = await actionsFlow.start({
      lobbyUuid: LOBBY_UUID,
      userUuid: USER_UUID,
    })

    assert.deepEqual(result, {
      status: 'failure',
      error: 'Lobby is not ready to start a game',
    })
  })

  test('kicks a player through the dedicated use case payload', async ({ assert }) => {
    const { actionsFlow, kickCalls } = createActionsFlow()

    const result = await actionsFlow.kickPlayer({
      lobbyUuid: LOBBY_UUID,
      kickerUuid: USER_UUID,
      targetPlayerUuid: TARGET_USER_UUID,
    })

    assert.equal(result.status, 'kicked')
    assert.deepEqual(kickCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        kickerUuid: USER_UUID,
        targetPlayerUuid: TARGET_USER_UUID,
      },
    ])
  })

  test('maps admin close not found failures to 404 and other failures to 400', async ({
    assert,
  }) => {
    const notFound = await createActionsFlow({
      closeError: 'Lobby not found',
    }).actionsFlow.adminClose({
      lobbyUuid: LOBBY_UUID,
      closedByUserUuid: USER_UUID,
      closedByRole: 'ADMIN',
    })
    const forbidden = await createActionsFlow({
      closeError: 'Cannot close a lobby while a game is starting',
    }).actionsFlow.adminClose({
      lobbyUuid: LOBBY_UUID,
      closedByUserUuid: USER_UUID,
      closedByRole: 'ADMIN',
    })

    assert.deepEqual(notFound, {
      status: 'failure',
      error: 'Lobby not found',
      httpStatus: 404,
    })
    assert.deepEqual(forbidden, {
      status: 'failure',
      error: 'Cannot close a lobby while a game is starting',
      httpStatus: 400,
    })
  })

  test('closes a lobby with moderation log context', async ({ assert }) => {
    const { actionsFlow, closeCalls } = createActionsFlow()

    const result = await actionsFlow.adminClose({
      lobbyUuid: LOBBY_UUID,
      closedByUserUuid: USER_UUID,
      closedByRole: 'ADMIN',
      reason: 'cleanup',
    })

    assert.equal(result.status, 'closed')
    if (result.status !== 'closed') return

    assert.deepEqual(closeCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        closedByUserUuid: USER_UUID,
        closedByRole: 'ADMIN',
        reason: 'cleanup',
      },
    ])
    assert.deepEqual(result.logContext, {
      lobbyUuid: LOBBY_UUID,
      reason: 'cleanup',
      closedByUserUuid: USER_UUID,
      closedByRole: 'ADMIN',
    })
  })

  test('transfers ownership through the dedicated use case payload', async ({ assert }) => {
    const { actionsFlow, transferCalls } = createActionsFlow()

    const result = await actionsFlow.transferOwnership({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: USER_UUID,
      newOwnerUuid: TARGET_USER_UUID,
    })

    assert.equal(result.status, 'transferred')
    if (result.status !== 'transferred') return

    assert.deepEqual(transferCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        currentOwnerUuid: USER_UUID,
        newOwnerUuid: TARGET_USER_UUID,
      },
    ])
    assert.deepEqual(result.value, {
      success: true,
      lobbyUuid: LOBBY_UUID,
      previousOwnerUuid: USER_UUID,
      newOwnerUuid: TARGET_USER_UUID,
      lobbyState: { uuid: LOBBY_UUID, createdBy: TARGET_USER_UUID },
    })
  })

  test('maps ownership transfer failures to 404, 403 or 400', async ({ assert }) => {
    const notFound = await createActionsFlow({
      transferError: 'Lobby not found',
    }).actionsFlow.transferOwnership({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: USER_UUID,
      newOwnerUuid: TARGET_USER_UUID,
    })
    const forbidden = await createActionsFlow({
      transferError: 'Only the lobby creator can transfer ownership',
    }).actionsFlow.transferOwnership({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: USER_UUID,
      newOwnerUuid: TARGET_USER_UUID,
    })
    const invalid = await createActionsFlow({
      transferError: 'Target player is not in this lobby',
    }).actionsFlow.transferOwnership({
      lobbyUuid: LOBBY_UUID,
      currentOwnerUuid: USER_UUID,
      newOwnerUuid: TARGET_USER_UUID,
    })

    assert.deepEqual(notFound, {
      status: 'failure',
      error: 'Lobby not found',
      httpStatus: 404,
    })
    assert.deepEqual(forbidden, {
      status: 'failure',
      error: 'Only the lobby creator can transfer ownership',
      httpStatus: 403,
    })
    assert.deepEqual(invalid, {
      status: 'failure',
      error: 'Target player is not in this lobby',
      httpStatus: 400,
    })
  })
})
