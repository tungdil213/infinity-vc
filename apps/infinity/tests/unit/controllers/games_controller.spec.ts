import { test } from '@japa/runner'
import GamesController from '../../../app/controllers/games_controller.js'
import Game from '../../../app/domain/entities/game.js'
import { GameStatus } from '../../../app/domain/value_objects/game_status.js'
import env from '../../../start/env.js'
import { StableEnvelopeSigner } from '@infinity.dev/boardgame-toolkit/serialization'
import { replayImportGuardService } from '../../../app/application/services/replay_import_guard_service.js'
import type { GameReplayStep } from '../../../app/application/services/game_engine_types.js'

const ACTIVE_GAME_UUID = '11111111-1111-4111-8111-111111111111'
const OTHER_GAME_UUID = '22222222-2222-4222-8222-222222222222'

function makeGame(input?: {
  uuid?: string
  status?: GameStatus
  playerUuids?: string[]
  startedAt?: Date
  lobbyId?: string
  gameType?: string
  runtimeOverrides?: Record<string, unknown>
}): Game {
  const uuid = input?.uuid ?? ACTIVE_GAME_UUID
  const status = input?.status ?? GameStatus.IN_PROGRESS
  const playerUuids = input?.playerUuids ?? ['player-1', 'player-2']
  const startedAt = input?.startedAt ?? new Date('2026-03-20T10:00:00.000Z')
  const lobbyId = input?.lobbyId ?? 'lobby-1'
  const gameType = input?.gameType ?? 'rock-paper-scissors'

  const players = playerUuids.map((playerUuid) => ({
    uuid: playerUuid,
    nickName: `Player ${playerUuid}`,
  }))

  return Game.reconstitute(
    uuid,
    status,
    players,
    {
      currentRound: 1,
      currentTurn: 0,
      eliminatedPlayers: [],
      playerHands: {},
      discardPile: [],
      deck: { remaining: 10 },
      runtime: {
        gameType,
        lobbyId,
        persistedAt: '2026-03-25T09:00:00.000Z',
        ...(input?.runtimeOverrides ?? {}),
      },
    },
    startedAt,
    [GameStatus.FINISHED, GameStatus.ABANDONED, GameStatus.ARCHIVED].includes(status)
      ? new Date('2026-03-20T11:00:00.000Z')
      : undefined
  )
}

function createResponseHarness() {
  const state: {
    redirectedTo: string | null
    statusCode: number | null
    payload: unknown
  } = {
    redirectedTo: null,
    statusCode: null,
    payload: null,
  }

  const response = {
    redirect(path: string) {
      state.redirectedTo = path
      return path
    },
    json(payload: unknown) {
      state.payload = payload
      return payload
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
  }

  return { response, state }
}

function createI18nHarness() {
  return {
    t(key: string) {
      return `translated:${key}`
    },
  }
}

function createReplayTimeline(): GameReplayStep[] {
  return [
    {
      step: 0,
      kind: 'initial' as const,
      recordedAt: '2026-04-07T10:00:00.000Z',
      events: [],
      snapshot: {
        phase: 'setup',
        round: 1,
        turn: 0,
        isFinished: false,
        winnerId: null,
        currentPlayerId: null,
        players: [],
      },
    },
  ]
}

function createReplayEnvelope(payload: Record<string, unknown>) {
  const signer = new StableEnvelopeSigner([
    {
      id: 'replay-v1',
      secret: env.get('APP_KEY'),
      algorithm: 'sha256',
    },
  ])

  return signer.sign(payload)
}

function tamperEnvelopeSignature(signature: string): string {
  const parts = signature.split(':')
  const digest = parts.length > 1 ? parts[1] : signature
  const first = digest[0] === 'a' ? 'b' : 'a'
  const tamperedDigest = `${first}${digest.slice(1)}`
  return parts.length > 1 ? `${parts[0]}:${tamperedDigest}` : tamperedDigest
}

test.group('GamesController', (group) => {
  group.each.setup(() => {
    replayImportGuardService.resetMetrics()
  })

  test('resume redirects to game page when user is a participant of an active game', async ({
    assert,
  }) => {
    const controller = new GamesController({
      findByUuid: async () => makeGame(),
    } as any)
    const { response, state } = createResponseHarness()
    const flashes: Array<{ type: string; message: string }> = []

    await controller.resume({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'player-1' } },
      response,
      session: {
        flash(type: string, message: string) {
          flashes.push({ type, message })
        },
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.redirectedTo, `/games/${ACTIVE_GAME_UUID}`)
    assert.deepEqual(flashes, [])
  })

  test('resume denies access when user is not in the game', async ({ assert }) => {
    const controller = new GamesController({
      findByUuid: async () => makeGame({ playerUuids: ['player-2', 'player-3'] }),
    } as any)
    const { response, state } = createResponseHarness()
    const flashes: Array<{ type: string; message: string }> = []

    await controller.resume({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'player-1' } },
      response,
      session: {
        flash(type: string, message: string) {
          flashes.push({ type, message })
        },
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.redirectedTo, '/lobbies')
    assert.deepEqual(flashes, [
      {
        type: 'error',
        message: 'translated:games.errors.resumeUnauthorized',
      },
    ])
  })

  test('resume rejects finished games', async ({ assert }) => {
    const controller = new GamesController({
      findByUuid: async () =>
        makeGame({
          status: GameStatus.FINISHED,
          playerUuids: ['player-1', 'player-2'],
        }),
    } as any)
    const { response, state } = createResponseHarness()
    const flashes: Array<{ type: string; message: string }> = []

    await controller.resume({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'player-1' } },
      response,
      session: {
        flash(type: string, message: string) {
          flashes.push({ type, message })
        },
      },
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.redirectedTo, '/profile')
    assert.deepEqual(flashes, [
      {
        type: 'error',
        message: 'translated:games.errors.resumeUnavailable',
      },
    ])
  })

  test('myActive returns projected active games for current user', async ({ assert }) => {
    const controller = new GamesController({
      findActiveByPlayer: async () => [
        makeGame({
          uuid: OTHER_GAME_UUID,
          status: GameStatus.PAUSED,
          startedAt: new Date('2026-03-10T09:00:00.000Z'),
          lobbyId: 'lobby-older',
          gameType: 'love-letter',
        }),
        makeGame({
          uuid: ACTIVE_GAME_UUID,
          status: GameStatus.IN_PROGRESS,
          startedAt: new Date('2026-03-20T09:00:00.000Z'),
          lobbyId: 'lobby-newer',
          gameType: 'rock-paper-scissors',
        }),
      ],
    } as any)
    const { response, state } = createResponseHarness()

    await controller.myActive({
      auth: { user: { userUuid: 'player-1' } },
      response,
    } as any)

    const payload = state.payload as {
      userUuid: string
      total: number
      activeGames: Array<{
        gameUuid: string
        status: 'IN_PROGRESS' | 'PAUSED'
        lobbyUuid: string | null
      }>
    }

    assert.equal(payload.userUuid, 'player-1')
    assert.equal(payload.total, 2)
    assert.equal(payload.activeGames[0].gameUuid, ACTIVE_GAME_UUID)
    assert.equal(payload.activeGames[0].status, 'IN_PROGRESS')
    assert.equal(payload.activeGames[0].lobbyUuid, 'lobby-newer')
    assert.equal(payload.activeGames[1].gameUuid, OTHER_GAME_UUID)
    assert.equal(payload.activeGames[1].status, 'PAUSED')
  })

  test('replay rejects persisted timeline when replay envelope verification fails', async ({
    assert,
  }) => {
    const replayTimeline = createReplayTimeline()
    const validEnvelope = createReplayEnvelope({
      gameId: ACTIVE_GAME_UUID,
      replayTimeline,
    })
    const invalidEnvelope = {
      ...validEnvelope,
      signature: tamperEnvelopeSignature(validEnvelope.signature),
    }

    const controller = new GamesController({
      findByUuid: async () =>
        makeGame({
          status: GameStatus.FINISHED,
          runtimeOverrides: {
            replayTimeline,
            replayEnvelope: invalidEnvelope,
          },
        }),
    } as any)
    const { response, state } = createResponseHarness()

    await controller.replay({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'player-1', normalizedRole: 'PLAYER' } },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.statusCode, 422)
    assert.deepEqual(state.payload, {
      error: 'translated:games.errors.replayVerificationFailed',
      reason: 'invalid_signature',
    })

    assert.deepEqual(replayImportGuardService.exportMetrics(), {
      accepted: 0,
      rejected: 1,
      rejectedByReason: {
        invalid_signature: 1,
      },
      byOperation: {
        replay: {
          accepted: 0,
          rejected: 1,
          rejectedByReason: {
            invalid_signature: 1,
          },
        },
      },
      bySource: {
        persistence: {
          accepted: 0,
          rejected: 1,
          rejectedByReason: {
            invalid_signature: 1,
          },
        },
      },
    })
  })

  test('verificationMetrics returns replay/import guard counters', async ({ assert }) => {
    const replayTimeline = createReplayTimeline()
    await replayImportGuardService.verifyReplay({
      gameId: ACTIVE_GAME_UUID,
      actorId: 'player-1',
      source: 'memory',
      replayTimeline,
      envelope: null,
    })

    const controller = new GamesController({} as any)
    const { response, state } = createResponseHarness()

    await controller.verificationMetrics({
      response,
    } as any)

    assert.deepEqual(state.payload, {
      accepted: 1,
      rejected: 0,
      rejectedByReason: {},
      byOperation: {
        replay: {
          accepted: 1,
          rejected: 0,
          rejectedByReason: {},
        },
      },
      bySource: {
        memory: {
          accepted: 1,
          rejected: 0,
          rejectedByReason: {},
        },
      },
    })
  })

  test('importReplay rejects tampered envelope and does not persist game update', async ({
    assert,
  }) => {
    const replayTimeline = createReplayTimeline()
    const validEnvelope = createReplayEnvelope({
      gameId: ACTIVE_GAME_UUID,
      replayTimeline,
    })
    const invalidEnvelope = {
      ...validEnvelope,
      signature: tamperEnvelopeSignature(validEnvelope.signature),
    }
    let saveCalls = 0
    const controller = new GamesController({
      findByUuid: async () => makeGame({ status: GameStatus.PAUSED }),
      save: async () => {
        saveCalls += 1
      },
    } as any)
    const { response, state } = createResponseHarness()

    await controller.importReplay({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'admin-1' } },
      request: {
        validateUsing: async () => ({
          replayTimeline,
          envelope: invalidEnvelope,
        }),
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.equal(state.statusCode, 422)
    assert.deepEqual(state.payload, {
      error: 'translated:games.errors.importVerificationFailed',
      reason: 'invalid_signature',
    })
    assert.equal(saveCalls, 0)
  })

  test('importReplay persists replay timeline when envelope is valid', async ({ assert }) => {
    const replayTimeline = createReplayTimeline()
    const validEnvelope = createReplayEnvelope({
      gameId: ACTIVE_GAME_UUID,
      replayTimeline,
    })
    const savedState: { runtime?: Record<string, unknown> } = {}
    const controller = new GamesController({
      findByUuid: async () => makeGame({ status: GameStatus.PAUSED }),
      save: async (game: Game) => {
        savedState.runtime = game.gameData.runtime as Record<string, unknown>
      },
    } as any)
    const { response, state } = createResponseHarness()

    await controller.importReplay({
      params: { uuid: ACTIVE_GAME_UUID },
      auth: { user: { userUuid: 'admin-1' } },
      request: {
        validateUsing: async () => ({
          replayTimeline,
          envelope: validEnvelope,
        }),
      },
      response,
      i18n: createI18nHarness(),
    } as any)

    assert.deepEqual(state.payload, {
      gameId: ACTIVE_GAME_UUID,
      importedSteps: 1,
    })
    const persistedRuntime = savedState.runtime
    if (!persistedRuntime) {
      throw new Error('expected game to be persisted')
    }
    const persistedTimeline = persistedRuntime.replayTimeline as GameReplayStep[]
    assert.lengthOf(persistedTimeline, 1)
    assert.equal(persistedTimeline[0]?.step, replayTimeline[0]?.step)
    assert.equal(persistedTimeline[0]?.kind, replayTimeline[0]?.kind)
    assert.deepEqual(persistedRuntime.replayEnvelope, validEnvelope)
    assert.equal(persistedRuntime.importedBy, 'admin-1')
    assert.typeOf(persistedRuntime.importedAt, 'string')
  })

  test('resetVerificationMetrics clears counters', async ({ assert }) => {
    const replayTimeline = createReplayTimeline()
    await replayImportGuardService.verifyReplay({
      gameId: ACTIVE_GAME_UUID,
      actorId: 'player-1',
      source: 'memory',
      replayTimeline,
      envelope: null,
    })

    const controller = new GamesController({} as any)
    const { response, state } = createResponseHarness()

    await controller.resetVerificationMetrics({
      response,
    } as any)

    assert.deepEqual(state.payload, {
      ok: true,
      metrics: {
        accepted: 0,
        rejected: 0,
        rejectedByReason: {},
        byOperation: {},
        bySource: {},
      },
    })
  })
})
