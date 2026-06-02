import { test } from '@japa/runner'
import { EnhancedLobbiesControllerJoinFlow } from '../../../../app/controllers/support/enhanced_lobbies_controller_join.js'

const LOBBY_UUID = '11111111-1111-4111-8111-111111111111'
const USER_UUID = '22222222-2222-4222-8222-222222222222'

type JoinPayload = {
  lobbyUuid: string
  userUuid: string
  password?: string
}

type LobbyPayload = {
  uuid: string
  isPrivate?: boolean
  hasPassword?: boolean
}

class JoinLobbyUseCaseDouble {
  readonly calls: JoinPayload[] = []

  constructor(
    private readonly options: {
      error?: string
      thrownError?: Error
      lobby?: LobbyPayload
    } = {}
  ) {}

  async execute(payload: JoinPayload) {
    this.calls.push(payload)

    if (this.options.thrownError) {
      throw this.options.thrownError
    }

    if (this.options.error) {
      return {
        isFailure: true as const,
        error: this.options.error,
      }
    }

    return {
      isFailure: false as const,
      value: {
        lobby: this.options.lobby ?? {
          uuid: payload.lobbyUuid,
          isPrivate: false,
          hasPassword: false,
        },
      },
    }
  }
}

class PresenceFlowDouble {
  readonly markConnectedCalls: Array<JoinPayload & { gracePeriodMs?: number }> = []
  readonly resolveGracePeriodCalls: Array<LobbyPayload | null | undefined> = []

  markConnected(payload: JoinPayload & { gracePeriodMs?: number }) {
    this.markConnectedCalls.push(payload)
  }

  resolveGracePeriodMs(lobby?: LobbyPayload | null) {
    this.resolveGracePeriodCalls.push(lobby)
    return lobby?.isPrivate || lobby?.hasPassword ? 90_000 : undefined
  }
}

test.group('enhanced_lobbies_controller_join', () => {
  test('joins through the use case and marks presence with the resolved grace period', async ({
    assert,
  }) => {
    const lobby = {
      uuid: LOBBY_UUID,
      isPrivate: true,
      hasPassword: true,
    }
    const joinLobbyUseCase = new JoinLobbyUseCaseDouble({ lobby })
    const presenceFlow = new PresenceFlowDouble()
    const joinFlow = new EnhancedLobbiesControllerJoinFlow(
      joinLobbyUseCase as any,
      presenceFlow as any
    )

    const result = await joinFlow.join({
      lobbyUuid: LOBBY_UUID,
      userUuid: USER_UUID,
      password: 'secret',
    })

    assert.equal(result.status, 'joined')
    assert.deepEqual(joinLobbyUseCase.calls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        password: 'secret',
      },
    ])
    assert.deepEqual(presenceFlow.resolveGracePeriodCalls, [lobby])
    assert.deepEqual(presenceFlow.markConnectedCalls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        gracePeriodMs: 90_000,
      },
    ])
  })

  test('returns use case failures without marking presence', async ({ assert }) => {
    const joinLobbyUseCase = new JoinLobbyUseCaseDouble({ error: 'Lobby is full' })
    const presenceFlow = new PresenceFlowDouble()
    const joinFlow = new EnhancedLobbiesControllerJoinFlow(
      joinLobbyUseCase as any,
      presenceFlow as any
    )

    const result = await joinFlow.join({
      lobbyUuid: LOBBY_UUID,
      userUuid: USER_UUID,
    })

    assert.deepEqual(result, {
      status: 'failure',
      error: 'Lobby is full',
    })
    assert.deepEqual(joinLobbyUseCase.calls, [
      {
        lobbyUuid: LOBBY_UUID,
        userUuid: USER_UUID,
        password: undefined,
      },
    ])
    assert.deepEqual(presenceFlow.resolveGracePeriodCalls, [])
    assert.deepEqual(presenceFlow.markConnectedCalls, [])
  })

  test('lets unexpected use case errors bubble without marking presence', async ({ assert }) => {
    const joinLobbyUseCase = new JoinLobbyUseCaseDouble({ thrownError: new Error('boom') })
    const presenceFlow = new PresenceFlowDouble()
    const joinFlow = new EnhancedLobbiesControllerJoinFlow(
      joinLobbyUseCase as any,
      presenceFlow as any
    )

    await assert.rejects(
      () =>
        joinFlow.join({
          lobbyUuid: LOBBY_UUID,
          userUuid: USER_UUID,
        }),
      'boom'
    )

    assert.deepEqual(presenceFlow.resolveGracePeriodCalls, [])
    assert.deepEqual(presenceFlow.markConnectedCalls, [])
  })
})
