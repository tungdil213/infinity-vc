import { test } from '@japa/runner'
import EnhancedLobbiesController from '../../../app/controllers/enhanced_lobbies_controller.js'

const LOBBY_UUID = '11111111-1111-4111-8111-111111111111'
const USER_UUID = '22222222-2222-4222-8222-222222222222'
const OTHER_USER_UUID = '33333333-3333-4333-8333-333333333333'

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
  closeLobbyResult?: { isFailure: boolean; error?: string }
}) {
  const leaveLobbyCalls: Array<{ lobbyUuid: string; userUuid: string }> = []
  const joinLobbyCalls: Array<{ lobbyUuid: string; userUuid: string; password?: string }> = []
  const closeLobbyCalls: Array<Record<string, unknown>> = []
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
    {} as any,
    {} as any,
    {} as any,
    {} as any,
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
    leaveLobbyCalls,
    closeLobbyCalls,
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
