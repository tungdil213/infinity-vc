import { test } from '@japa/runner'
import type { GameSession } from '../../../../app/application/services/game_engine_service.js'
import type { GameReplayStep } from '../../../../app/application/services/game_engine_types.js'
import {
  canViewDebugPayload,
  resolveGameActionsView,
  resolveGameRuntimeAccess,
  resolveGameRuntimeView,
  sanitizeReplayTimelineForViewer,
} from '../../../../app/controllers/support/game_controller_runtime.js'

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
      players: playerIds.map((id) => ({
        id,
        name: `Player ${id}`,
        isActive: true,
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

test.group('game_controller_runtime', () => {
  test('resolves participant runtime view with presentation metadata and debug replay payloads', async ({
    assert,
  }) => {
    const session = makeSession()
    const replayTimeline = makeReplayTimeline()

    const view = await resolveGameRuntimeView({
      gameUuid: GAME_UUID,
      user: { userUuid: 'player-1', normalizedRole: 'ADMIN' },
      resolveRuntimeSession: async () => ({ session, source: 'restored' }),
      runtimeReader: {
        getPlayerView: () => ({ playerId: 'player-1', state: { phase: 'waiting_move' } }),
        getAvailableActions: () => ['submit_move'],
        getReplayTimeline: () => replayTimeline,
      },
      presentationResolver: {
        resolvePresentation: () => undefined,
        resolveDisplayName: () => 'Rock Paper Scissors',
      },
    })

    assert.isNotNull(view)
    assert.equal(view!.isSpectator, false)
    assert.deepEqual(view!.availableActions, ['submit_move'])
    assert.equal(view!.gameDisplayName, 'Rock Paper Scissors')
    assert.deepEqual(view!.runtimeStatus, {
      source: 'restored',
      persisted: true,
      inMemory: true,
    })
    assert.deepEqual(view!.replayTimeline[0].actionPayload, { move: 'rock' })
    assert.deepEqual(view!.replayTimeline[0].events[0].payload, { move: 'rock' })
  })

  test('resolves spectator runtime view without player actions or debug replay payloads', async ({
    assert,
  }) => {
    const session = makeSession(['player-1'])
    const replayTimeline = makeReplayTimeline()
    let getPlayerViewCalls = 0
    let getAvailableActionsCalls = 0

    const view = await resolveGameRuntimeView({
      gameUuid: GAME_UUID,
      user: { userUuid: 'spectator-1', normalizedRole: 'PLAYER' },
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
      runtimeReader: {
        getPlayerView: () => {
          getPlayerViewCalls += 1
          return null
        },
        getAvailableActions: () => {
          getAvailableActionsCalls += 1
          return ['submit_move']
        },
        getReplayTimeline: () => replayTimeline,
      },
      presentationResolver: {
        resolvePresentation: () => undefined,
        resolveDisplayName: () => 'Rock Paper Scissors',
      },
    })

    assert.isNotNull(view)
    assert.equal(view!.isSpectator, true)
    assert.deepEqual(view!.availableActions, [])
    assert.equal(getPlayerViewCalls, 0)
    assert.equal(getAvailableActionsCalls, 0)
    assert.deepEqual(view!.runtimeStatus, {
      source: 'memory',
      persisted: false,
      inMemory: true,
    })
    assert.isUndefined(view!.replayTimeline[0].actionPayload)
    assert.isUndefined(view!.replayTimeline[0].events[0].payload)
  })

  test('resolves actions view without calling action provider for spectators', async ({
    assert,
  }) => {
    const session = makeSession(['player-1'])
    let getAvailableActionsCalls = 0

    const actionsView = await resolveGameActionsView({
      gameUuid: GAME_UUID,
      userUuid: 'spectator-1',
      resolveRuntimeSession: async () => ({ session, source: 'memory' }),
      getAvailableActions: () => {
        getAvailableActionsCalls += 1
        return ['submit_move']
      },
    })

    assert.isNotNull(actionsView)
    assert.equal(actionsView!.isSpectator, true)
    assert.deepEqual(actionsView!.availableActions, [])
    assert.equal(getAvailableActionsCalls, 0)
  })

  test('returns null access when the runtime session cannot be resolved', async ({ assert }) => {
    const access = await resolveGameRuntimeAccess({
      gameUuid: GAME_UUID,
      userUuid: 'player-1',
      resolveRuntimeSession: async () => null,
    })

    assert.isNull(access)
  })

  test('sanitizes replay payloads for non-admin viewers only', ({ assert }) => {
    const replayTimeline = makeReplayTimeline()

    assert.equal(canViewDebugPayload('ADMIN'), true)
    assert.equal(canViewDebugPayload('PLAYER'), false)
    assert.equal(sanitizeReplayTimelineForViewer(replayTimeline, true), replayTimeline)

    const sanitized = sanitizeReplayTimelineForViewer(replayTimeline, false)
    assert.isUndefined(sanitized[0].actionPayload)
    assert.isUndefined(sanitized[0].events[0].payload)
  })
})
