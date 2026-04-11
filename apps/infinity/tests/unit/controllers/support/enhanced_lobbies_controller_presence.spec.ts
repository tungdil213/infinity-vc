import { test } from '@japa/runner'
import {
  EnhancedLobbiesControllerPresence,
  type LobbyBeaconPayload,
} from '../../../../app/controllers/support/enhanced_lobbies_controller_presence.js'
import type {
  LobbyConnectionPayload,
  PendingLeavePayload,
} from '../../../../app/application/services/lobby_presence_service.js'

class LobbyPresenceServiceDouble {
  readonly markConnectedCalls: LobbyConnectionPayload[] = []
  readonly scheduleLeaveOnDisconnectCalls: LobbyConnectionPayload[] = []
  readonly cancelPendingLeaveCalls: PendingLeavePayload[] = []
  readonly clearConnectionCalls: PendingLeavePayload[] = []
  lastScheduledHandler: ((payload: PendingLeavePayload) => Promise<void>) | null = null
  lastStaleLeaveHandler: ((payload: PendingLeavePayload) => Promise<void>) | null = null

  markConnected(
    payload: LobbyConnectionPayload,
    onStaleLeave?: (payload: PendingLeavePayload) => Promise<void>
  ): void {
    this.markConnectedCalls.push(payload)
    this.lastStaleLeaveHandler = onStaleLeave ?? null
  }

  scheduleLeaveOnDisconnect(
    payload: LobbyConnectionPayload,
    onLeave: (payload: PendingLeavePayload) => Promise<void>
  ): { scheduled: true; gracePeriodMs: number } {
    this.scheduleLeaveOnDisconnectCalls.push(payload)
    this.lastScheduledHandler = onLeave

    return {
      scheduled: true,
      gracePeriodMs: payload.gracePeriodMs ?? 45_000,
    }
  }

  cancelPendingLeave(payload: PendingLeavePayload): boolean {
    this.cancelPendingLeaveCalls.push(payload)
    return true
  }

  clearConnection(payload: PendingLeavePayload): boolean {
    this.clearConnectionCalls.push(payload)
    return true
  }
}

function createLeaveLobbyUseCaseDouble(result?: { isFailure: boolean; error?: string }) {
  const receivedPayloads: PendingLeavePayload[] = []

  return {
    receivedPayloads,
    useCase: {
      async execute(payload: PendingLeavePayload) {
        receivedPayloads.push(payload)

        if (result?.isFailure) {
          return {
            isFailure: true as const,
            error: result.error ?? 'leave failed',
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
    },
  }
}

test.group('enhanced_lobbies_controller_presence', () => {
  test('parses beacon payloads from object, nested payload and invalid input', ({ assert }) => {
    const presence = new EnhancedLobbiesControllerPresence(
      new LobbyPresenceServiceDouble() as any,
      createLeaveLobbyUseCaseDouble().useCase as any
    )

    const directPayload = presence.parseBeaconPayload({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
      clientSessionId: 'session-1',
    })
    const nestedPayload = presence.parseBeaconPayload({
      payload: JSON.stringify({
        lobbyUuid: '33333333-3333-4333-8333-333333333333',
        userUuid: '44444444-4444-4444-8444-444444444444',
        clientSessionId: 'session-2',
      } satisfies LobbyBeaconPayload),
    })
    const invalidPayload = presence.parseBeaconPayload('{invalid json')

    assert.deepEqual(directPayload, {
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
      clientSessionId: 'session-1',
    })
    assert.deepEqual(nestedPayload, {
      lobbyUuid: '33333333-3333-4333-8333-333333333333',
      userUuid: '44444444-4444-4444-8444-444444444444',
      clientSessionId: 'session-2',
    })
    assert.deepEqual(invalidPayload, {})
  })

  test('marks presence connected and resolves async grace period for private lobbies', ({
    assert,
  }) => {
    const presenceService = new LobbyPresenceServiceDouble()
    const presence = new EnhancedLobbiesControllerPresence(
      presenceService as any,
      createLeaveLobbyUseCaseDouble().useCase as any
    )

    presence.markConnected({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
      clientSessionId: 'session-1',
    })

    assert.lengthOf(presenceService.markConnectedCalls, 1)
    assert.isFunction(presenceService.lastStaleLeaveHandler)
    assert.isUndefined(presence.resolveGracePeriodMs({ isPrivate: false, hasPassword: false }))
    assert.isAbove(presence.resolveGracePeriodMs({ isPrivate: true }) ?? 0, 0)
  })

  test('schedules delayed leave and clears connection after successful leave execution', async ({
    assert,
  }) => {
    const presenceService = new LobbyPresenceServiceDouble()
    const leaveLobbyUseCase = createLeaveLobbyUseCaseDouble()
    const presence = new EnhancedLobbiesControllerPresence(
      presenceService as any,
      leaveLobbyUseCase.useCase as any
    )

    const scheduling = presence.scheduleLeaveOnDisconnect({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
      clientSessionId: 'session-1',
    })

    assert.deepEqual(scheduling, { scheduled: true, gracePeriodMs: 45_000 })
    assert.isFunction(presenceService.lastScheduledHandler)

    await presenceService.lastScheduledHandler!({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
    })

    assert.deepEqual(leaveLobbyUseCase.receivedPayloads, [
      {
        lobbyUuid: '11111111-1111-4111-8111-111111111111',
        userUuid: '22222222-2222-4222-8222-222222222222',
      },
    ])
    assert.deepEqual(presenceService.clearConnectionCalls, [
      {
        lobbyUuid: '11111111-1111-4111-8111-111111111111',
        userUuid: '22222222-2222-4222-8222-222222222222',
      },
    ])
  })

  test('treats already-left stale heartbeat failures as safe connection clears', async ({
    assert,
  }) => {
    const presenceService = new LobbyPresenceServiceDouble()
    const leaveLobbyUseCase = createLeaveLobbyUseCaseDouble({
      isFailure: true,
      error: 'Player is not in this lobby',
    })
    const presence = new EnhancedLobbiesControllerPresence(
      presenceService as any,
      leaveLobbyUseCase.useCase as any
    )

    presence.markConnected({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
    })

    await presenceService.lastStaleLeaveHandler!({
      lobbyUuid: '11111111-1111-4111-8111-111111111111',
      userUuid: '22222222-2222-4222-8222-222222222222',
    })

    assert.deepEqual(presenceService.clearConnectionCalls, [
      {
        lobbyUuid: '11111111-1111-4111-8111-111111111111',
        userUuid: '22222222-2222-4222-8222-222222222222',
      },
    ])
  })
})
