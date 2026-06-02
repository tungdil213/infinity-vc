import { test } from '@japa/runner'
import EnhancedLobbiesController from '../../../app/controllers/enhanced_lobbies_controller.js'

const LOBBY_UUID = '11111111-1111-4111-8111-111111111111'
const USER_UUID = '22222222-2222-4222-8222-222222222222'
const OTHER_USER_UUID = '33333333-3333-4333-8333-333333333333'
const GAME_UUID = '44444444-4444-4444-8444-444444444444'

type ResponseState = {
  redirectedTo: string | null
  redirectedBack: number
  statusCode: number | null
  payload: unknown
}

type FlashEntry = {
  type: string
  message: string
}

function createResponseHarness() {
  const state: ResponseState = {
    redirectedTo: null,
    redirectedBack: 0,
    statusCode: null,
    payload: null,
  }

  const response = {
    redirect(target?: string) {
      if (typeof target === 'string') {
        state.redirectedTo = target
        return target
      }

      return {
        back() {
          state.redirectedBack += 1
          return 'back'
        },
      }
    },
    status(code: number) {
      state.statusCode = code
      return {
        json(payload: unknown) {
          state.payload = payload
          return payload
        },
      }
    },
    json(payload: unknown) {
      state.payload = payload
      return payload
    },
  }

  return { response, state }
}

function createSessionHarness() {
  const flashes: FlashEntry[] = []

  return {
    flashes,
    session: {
      flash(type: string, message: string) {
        flashes.push({ type, message })
      },
    },
  }
}

function createI18nHarness() {
  return {
    t(key: string) {
      return `translated:${key}`
    },
  }
}

function createController(overrides?: {
  leaveLobbyResult?: { isFailure: boolean; error?: string }
  scheduleGracePeriodMs?: number
  joinLobbyResult?: { isFailure: boolean; error?: string }
  joinLobbyError?: Error
  startGameResult?: { isFailure: boolean; error?: string }
  kickPlayerResult?: { isFailure: boolean; error?: string }
  closeLobbyResult?: { isFailure: boolean; error?: string }
  transferOwnershipResult?: { isFailure: boolean; error?: string }
}) {
  const leaveLobbyCalls: Array<{ lobbyUuid: string; userUuid: string }> = []
  const joinLobbyCalls: Array<{ lobbyUuid: string; userUuid: string; password?: string }> = []
  const startGameCalls: Array<{ lobbyUuid: string; userUuid: string }> = []
  const kickPlayerCalls: Array<{
    lobbyUuid: string
    kickerUuid: string
    targetPlayerUuid: string
  }> = []
  const closeLobbyCalls: Array<Record<string, unknown>> = []
  const transferOwnershipCalls: Array<Record<string, unknown>> = []
  const scheduleCalls: Array<Record<string, unknown>> = []
  const markConnectedCalls: Array<Record<string, unknown>> = []
  const clearConnectionCalls: Array<Record<string, unknown>> = []

  const controller = new EnhancedLobbiesController(
    {} as any,
    {
      async execute(payload: { lobbyUuid: string; userUuid: string; password?: string }) {
        joinLobbyCalls.push(payload)

        if (overrides?.joinLobbyError) {
          throw overrides.joinLobbyError
        }

        if (overrides?.joinLobbyResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.joinLobbyResult.error ?? 'join failed',
          }
        }

        return {
          isFailure: false as const,
          value: {
            lobby: {
              uuid: payload.lobbyUuid,
              isPrivate: false,
              hasPassword: false,
            },
          },
        }
      },
    } as any,
    {
      async execute(payload: { lobbyUuid: string; userUuid: string }) {
        leaveLobbyCalls.push(payload)

        if (overrides?.leaveLobbyResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.leaveLobbyResult.error ?? 'leave failed',
          }
        }

        return {
          isFailure: false as const,
          value: {
            lobby: {
              uuid: payload.lobbyUuid,
              name: 'Lobby',
              status: 'open',
              currentPlayers: 1,
              maxPlayers: 4,
              isPrivate: false,
              hasAvailableSlots: true,
              canStart: false,
              createdBy: payload.userUuid,
              players: [],
              availableActions: [],
              createdAt: new Date('2026-04-11T12:00:00.000Z'),
            },
            lobbyDeleted: false,
          },
        }
      },
    } as any,
    {
      async execute(payload: { lobbyUuid: string; userUuid: string }) {
        startGameCalls.push(payload)

        if (overrides?.startGameResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.startGameResult.error ?? 'start failed',
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
    {} as any,
    {} as any,
    {
      async execute(payload: { lobbyUuid: string; kickerUuid: string; targetPlayerUuid: string }) {
        kickPlayerCalls.push(payload)

        if (overrides?.kickPlayerResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.kickPlayerResult.error ?? 'kick failed',
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
        closeLobbyCalls.push(payload)

        if (overrides?.closeLobbyResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.closeLobbyResult.error ?? 'close failed',
          }
        }

        return {
          isFailure: false as const,
          value: {
            lobbyUuid: payload.lobbyUuid,
            reason: payload.reason ?? null,
            closedAt: new Date('2026-04-11T12:30:00.000Z').toISOString(),
          },
        }
      },
    } as any,
    {
      async execute(payload: Record<string, unknown>) {
        transferOwnershipCalls.push(payload)

        if (overrides?.transferOwnershipResult?.isFailure) {
          return {
            isFailure: true as const,
            error: overrides.transferOwnershipResult.error ?? 'transfer failed',
          }
        }

        return {
          isFailure: false as const,
          value: {
            success: true,
            lobbyUuid: payload.lobbyUuid,
            previousOwnerUuid: payload.currentOwnerUuid,
            newOwnerUuid: payload.newOwnerUuid,
            lobbyState: {
              uuid: payload.lobbyUuid,
              createdBy: payload.newOwnerUuid,
            },
          },
        }
      },
    } as any,
    {
      markConnected(payload: Record<string, unknown>) {
        markConnectedCalls.push(payload)
      },
      scheduleLeaveOnDisconnect(payload: Record<string, unknown>) {
        scheduleCalls.push(payload)
        return {
          scheduled: true,
          gracePeriodMs: overrides?.scheduleGracePeriodMs ?? 45_000,
        }
      },
      clearConnection(payload: Record<string, unknown>) {
        clearConnectionCalls.push(payload)
        return true
      },
      cancelPendingLeave() {
        return true
      },
    } as any,
    {
      findActiveByPlayer: async () => [],
    } as any
  )

  return {
    controller,
    joinLobbyCalls,
    startGameCalls,
    kickPlayerCalls,
    leaveLobbyCalls,
    closeLobbyCalls,
    transferOwnershipCalls,
    scheduleCalls,
    markConnectedCalls,
    clearConnectionCalls,
  }
}

test.group('EnhancedLobbiesController', () => {
  test('join keeps the success flash + redirect for html requests', async ({ assert }) => {
    const { controller, markConnectedCalls } = createController()
    const { response, state } = createResponseHarness()
    const { session, flashes } = createSessionHarness()

    await controller.join({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts(types: string[]) {
          return types.includes('html') ? 'html' : null
        },
        validateUsing: async () => ({
          password: undefined,
        }),
      },
      response,
      session,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(flashes, [
      {
        type: 'success',
        message: 'translated:lobbies.flash.joined',
      },
    ])
    assert.equal(state.redirectedTo, `/lobbies/${LOBBY_UUID}`)
    assert.deepEqual(markConnectedCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        gracePeriodMs: undefined,
      },
    ])
  })

  test('join preserves translated 400 payloads for use case failures on api requests', async ({
    assert,
  }) => {
    const { controller, joinLobbyCalls } = createController({
      joinLobbyResult: {
        isFailure: true,
        error: 'Lobby is full',
      },
    })
    const { response, state } = createResponseHarness()

    await controller.join({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
        validateUsing: async () => ({
          password: 'secret',
        }),
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(joinLobbyCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        password: 'secret',
      },
    ])
    assert.equal(state.statusCode, 400)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.errors.full',
    })
  })

  test('join preserves generic 500 payloads for unexpected api failures', async ({ assert }) => {
    const { controller } = createController({
      joinLobbyError: new Error('boom'),
    })
    const { response, state } = createResponseHarness()

    await controller.join({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
        validateUsing: async () => ({
          password: undefined,
        }),
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.statusCode, 500)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.api.joinFailed',
    })
  })

  test('leave keeps the explicit 200 success json payload for api requests', async ({ assert }) => {
    const { controller, leaveLobbyCalls, clearConnectionCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.leave({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(leaveLobbyCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
      },
    ])
    assert.deepEqual(clearConnectionCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
      },
    ])
    assert.equal(state.statusCode, 200)
    assert.deepEqual(state.payload, {
      success: true,
      message: 'translated:lobbies.api.left',
    })
  })

  test('start keeps the html redirect to the created game', async ({ assert }) => {
    const { controller, startGameCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.start({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts(types: string[]) {
          return types.includes('html') ? 'html' : null
        },
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(startGameCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
      },
    ])
    assert.equal(state.redirectedTo, `/games/${GAME_UUID}`)
    assert.equal(state.payload, null)
  })

  test('start preserves translated 400 payloads for use case failures', async ({ assert }) => {
    const { controller } = createController({
      startGameResult: {
        isFailure: true,
        error: 'Lobby is not ready to start a game',
      },
    })
    const { response, state } = createResponseHarness()

    await controller.start({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.statusCode, 400)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.errors.lobbyNotReady',
    })
  })

  test('kickPlayer keeps the success json payload and use case payload', async ({ assert }) => {
    const { controller, kickPlayerCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.kickPlayer({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        validateUsing: async () => ({
          playerUuid: OTHER_USER_UUID,
        }),
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(kickPlayerCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        kickerUuid: USER_UUID,
        targetPlayerUuid: OTHER_USER_UUID,
      },
    ])
    assert.deepEqual(state.payload, {
      success: true,
      message: 'translated:lobbies.api.kicked',
    })
  })

  test('transferOwnership keeps the success json payload and use case payload', async ({
    assert,
  }) => {
    const { controller, transferOwnershipCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.transferOwnership({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
        validateUsing: async () => ({
          newOwnerUuid: OTHER_USER_UUID,
        }),
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(transferOwnershipCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        currentOwnerUuid: USER_UUID,
        newOwnerUuid: OTHER_USER_UUID,
      },
    ])
    assert.deepEqual(state.payload, {
      success: true,
      lobbyUuid: LOBBY_UUID,
      previousOwnerUuid: USER_UUID,
      newOwnerUuid: OTHER_USER_UUID,
    })
  })

  test('transferOwnership maps non-owner failures to translated 403 payloads', async ({
    assert,
  }) => {
    const { controller } = createController({
      transferOwnershipResult: {
        isFailure: true,
        error: 'Only the lobby creator can transfer ownership',
      },
    })
    const { response, state } = createResponseHarness()

    await controller.transferOwnership({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
        validateUsing: async () => ({
          newOwnerUuid: OTHER_USER_UUID,
        }),
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.statusCode, 403)
    assert.deepEqual(state.payload, {
      error: 'translated:lobbies.errors.onlyCreatorCanTransfer',
    })
  })

  test('adminClose keeps the success json payload for api requests', async ({ assert }) => {
    const { controller, closeLobbyCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.adminClose({
      auth: {
        user: {
          userUuid: USER_UUID,
          normalizedRole: 'ADMIN',
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        accepts() {
          return null
        },
        validateUsing: async () => ({
          reason: 'cleanup',
        }),
      },
      response,
      session: {
        flash() {},
      },
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(closeLobbyCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        closedByUserUuid: USER_UUID,
        closedByRole: 'ADMIN',
        reason: 'cleanup',
      },
    ])
    assert.equal(state.statusCode, null)
    assert.deepEqual(state.payload, {
      success: true,
      lobbyUuid: LOBBY_UUID,
      reason: 'cleanup',
      closedAt: '2026-04-11T12:30:00.000Z',
      closedBy: {
        uuid: USER_UUID,
        role: 'ADMIN',
      },
    })
  })

  test('leaveOnClose keeps the 202 payload and scheduling contract unchanged', async ({
    assert,
  }) => {
    const { controller, scheduleCalls } = createController({
      scheduleGracePeriodMs: 90_000,
    })
    const { response, state } = createResponseHarness()

    await controller.leaveOnClose({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      request: {
        body() {
          return {
            lobbyUuid: LOBBY_UUID,
            userUuid: USER_UUID,
            clientSessionId: 'session-1',
          }
        },
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(scheduleCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        clientSessionId: 'session-1',
      },
    ])
    assert.equal(state.statusCode, 202)
    assert.deepEqual(state.payload, {
      success: true,
      message: 'translated:lobbies.api.leaveScheduled',
      gracePeriodMs: 90_000,
    })
  })

  test('heartbeat keeps the success payload unchanged and records lobby presence', async ({
    assert,
  }) => {
    const { controller, markConnectedCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.heartbeat({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        body() {
          return {
            userUuid: USER_UUID,
            clientSessionId: 'session-2',
          }
        },
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(markConnectedCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        clientSessionId: 'session-2',
      },
    ])
    assert.equal(state.statusCode, 200)
    assert.deepEqual(state.payload, { success: true })
  })

  test('heartbeat preserves the forbidden response for mismatched beacon users', async ({
    assert,
  }) => {
    const { controller, markConnectedCalls } = createController()
    const { response, state } = createResponseHarness()

    await controller.heartbeat({
      auth: {
        user: {
          userUuid: USER_UUID,
        },
      },
      params: {
        uuid: LOBBY_UUID,
      },
      request: {
        body() {
          return {
            userUuid: OTHER_USER_UUID,
            clientSessionId: 'session-3',
          }
        },
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.lengthOf(markConnectedCalls, 0)
    assert.equal(state.statusCode, 403)
    assert.deepEqual(state.payload, {
      error: 'translated:http.errors.forbidden',
    })
  })
})
