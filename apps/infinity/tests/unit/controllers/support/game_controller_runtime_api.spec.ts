import { test } from '@japa/runner'
import type { GameSession } from '../../../../app/application/services/game_engine_service.js'
import type { GameReplayStep } from '../../../../app/application/services/game_engine_types.js'
import {
  executeGameActionFlow,
  resolveGameActionsPayload,
  resolveGameApiPayload,
  resolvePublicPlayersPayload,
  type GameActionRuntimeReader,
} from '../../../../app/controllers/support/game_controller_runtime_api.js'

const GAME_UUID = 'game-1'

function makeSession(playerIds: string[] = ['player-1', 'player-2']): GameSession {
  return {
    gameId: GAME_UUID,
    lobbyId: 'lobby-1',
    gameType: 'rock-paper-scissors',
    engine: {} as any,
    state: {
      gameId: GAME_UUID,
      phase: 'waiting_move',
      round: 1,
      turn: 0,
      currentPlayerId: 'player-1',
      isFinished: false,
      winnerId: null,
      deckCount: 3,
      players: playerIds.map((id) => ({
        id,
        name: `Player ${id}`,
        isActive: true,
        isProtected: false,
        isEliminated: false,
        hand: ['hidden-card'],
      })),
    } as any,
    players: playerIds.map((id) => ({
      id,
      name: `Player ${id}`,
      isActive: true,
    })),
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    timeline: [],
  }
}

function makeReplayTimeline(): GameReplayStep[] {
  return [
    {
      step: 0,
      kind: 'action',
      recordedAt: '2026-06-01T10:00:00.000Z',
      actorId: 'player-1',
      actionType: 'submit_move',
      actionPayload: { move: 'rock' },
      events: [{ type: 'move_submitted', payload: { move: 'rock' } }],
      snapshot: {
        phase: 'waiting_move',
        round: 1,
        turn: 0,
        isFinished: false,
        winnerId: null,
        currentPlayerId: 'player-1',
        players: [],
      },
    },
  ]
}

function createRuntimeReader(overrides?: {
  actionResult?: {
    success: boolean
    error?: string
    events?: Array<{ type: string; payload: unknown }>
  }
}) {
  const calls: Array<Record<string, unknown>> = []
  const runtimeReader: GameActionRuntimeReader = {
    getPlayerView: (gameUuid, userUuid) => ({ gameUuid, userUuid, state: { phase: 'after' } }),
    getAvailableActions: () => ['submit_move'],
    getReplayTimeline: () => makeReplayTimeline(),
    drawCard: (gameUuid, userUuid) => {
      calls.push({ type: 'drawCard', gameUuid, userUuid })
      return {
        success: true,
        events: [{ type: 'card_drawn', payload: { hidden: true } }],
        newState: { isFinished: false, winnerId: null } as any,
      }
    },
    playCard: (gameUuid, userUuid, cardType, targetPlayerId, guessedCard) => {
      calls.push({ type: 'playCard', gameUuid, userUuid, cardType, targetPlayerId, guessedCard })
      return {
        success: true,
        events: [{ type: 'card_played', payload: { cardType } }],
        newState: { isFinished: false, winnerId: null } as any,
      }
    },
    executeAction: (request) => {
      calls.push({ type: 'executeAction', ...request })

      if (overrides?.actionResult?.success === false) {
        return {
          success: false,
          error: overrides.actionResult.error,
        }
      }

      return {
        success: true,
        events: overrides?.actionResult?.events ?? [
          { type: 'move_submitted', payload: { move: 'rock' } },
        ],
        newState: { isFinished: false, winnerId: null } as any,
      }
    },
  }

  return { runtimeReader, calls }
}

test.group('game_controller_runtime_api', () => {
  test('resolves the API payload for a runtime game', async ({ assert }) => {
    const session = makeSession()
    const { runtimeReader } = createRuntimeReader()

    const result = await resolveGameApiPayload({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'PLAYER' },
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
      runtimeReader,
      presentationResolver: {
        resolvePresentation: () => undefined,
        resolveDisplayName: () => 'Rock Paper Scissors',
      },
    })

    assert.equal(result.status, 'found')
    if (result.status !== 'found') return

    assert.equal(result.payload.gameId, GAME_UUID)
    assert.equal(result.payload.gameTitle, 'Rock Paper Scissors')
    assert.deepEqual(result.payload.availableActions, ['submit_move'])
    assert.isUndefined(result.payload.replayTimeline[0]?.actionPayload)
  })

  test('resolves actions and public players payloads through presenter contracts', async ({
    assert,
  }) => {
    const session = makeSession()
    const actionsPayload = await resolveGameActionsPayload({
      gameUuid: GAME_UUID,
      userUuid: 'player-1',
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
      getAvailableActions: () => ['submit_move'],
    })
    const playersPayload = await resolvePublicPlayersPayload({
      gameUuid: GAME_UUID,
      userUuid: 'player-1',
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
    })

    assert.equal(actionsPayload.status, 'found')
    assert.equal(playersPayload.status, 'found')
    if (actionsPayload.status !== 'found' || playersPayload.status !== 'found') return

    assert.deepEqual(actionsPayload.payload, {
      availableActions: ['submit_move'],
      isMyTurn: true,
      phase: 'waiting_move',
      isSpectator: false,
    })
    assert.equal(playersPayload.payload.currentPlayerId, 'player-1')
    assert.equal(playersPayload.payload.deckCount, 3)
    assert.lengthOf(playersPayload.payload.players, 2)
  })

  test('executes a parsed action, persists the session and hides event payloads for players', async ({
    assert,
  }) => {
    const session = makeSession()
    const { runtimeReader, calls } = createRuntimeReader()
    const persistedSessions: GameSession[] = []

    const result = await executeGameActionFlow({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'PLAYER' },
      rawActionInput: { actionType: 'submit_move', move: 'rock' },
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
      runtimeReader,
      persistSessionSnapshot: async (persistedSession) => {
        persistedSessions.push(persistedSession)
      },
      presentationResolver: {
        resolvePresentation: () => undefined,
        resolveDisplayName: () => 'Rock Paper Scissors',
      },
    })

    assert.equal(result.status, 'executed')
    if (result.status !== 'executed') return

    assert.deepEqual(calls, [
      {
        type: 'executeAction',
        gameId: GAME_UUID,
        playerId: 'player-1',
        actionType: 'submit_move',
        payload: { move: 'rock' },
      },
    ])
    assert.deepEqual(persistedSessions, [session])
    assert.equal(result.payload.gameTitle, 'Rock Paper Scissors')
    assert.isUndefined(result.payload.events[0]?.payload)
  })

  test('returns typed failures for spectators, invalid input and rejected actions', async ({
    assert,
  }) => {
    const spectatorSession = makeSession(['player-1'])
    const { runtimeReader: spectatorRuntimeReader } = createRuntimeReader()
    const spectatorResult = await executeGameActionFlow({
      gameUuid: GAME_UUID,
      user: { userUuid: 'spectator-1', normalizedRole: 'PLAYER' },
      rawActionInput: { actionType: 'submit_move', move: 'rock' },
      resolveRuntimeSession: async () => ({ session: spectatorSession, source: 'memory' }),
      runtimeReader: spectatorRuntimeReader,
      persistSessionSnapshot: async () => {},
    })

    const { runtimeReader: invalidRuntimeReader } = createRuntimeReader()
    const invalidResult = await executeGameActionFlow({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'PLAYER' },
      rawActionInput: {},
      resolveRuntimeSession: async () => ({ session: makeSession(), source: 'memory' }),
      runtimeReader: invalidRuntimeReader,
      persistSessionSnapshot: async () => {},
    })

    const { runtimeReader: rejectedRuntimeReader } = createRuntimeReader({
      actionResult: { success: false, error: 'Game not found' },
    })
    const rejectedResult = await executeGameActionFlow({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'PLAYER' },
      rawActionInput: { actionType: 'submit_move', move: 'rock' },
      resolveRuntimeSession: async () => ({ session: makeSession(), source: 'memory' }),
      runtimeReader: rejectedRuntimeReader,
      persistSessionSnapshot: async () => {},
    })

    assert.deepEqual(spectatorResult, { status: 'spectator' })
    assert.deepEqual(invalidResult, { status: 'invalid_action', error: 'action is required' })
    assert.deepEqual(rejectedResult, { status: 'rejected', error: 'Game not found' })
  })

  test('keeps action success even when persistence fails and reports the error', async ({
    assert,
  }) => {
    const { runtimeReader } = createRuntimeReader()
    const persistedErrors: unknown[] = []

    const result = await executeGameActionFlow({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'ADMIN' },
      rawActionInput: { action: 'draw' },
      resolveRuntimeSession: async () => ({ session: makeSession(), source: 'memory' }),
      runtimeReader,
      persistSessionSnapshot: async () => {
        throw new Error('persist failed')
      },
      onPersistError: (error) => {
        persistedErrors.push(error)
      },
    })

    assert.equal(result.status, 'executed')
    assert.lengthOf(persistedErrors, 1)
    assert.instanceOf(persistedErrors[0], Error)
    if (result.status !== 'executed') return
    assert.deepEqual(result.payload.events[0]?.payload, { hidden: true })
  })
})
