import { test } from '@japa/runner'
import type { ReplayImportGuardDecision } from '../../../../app/application/services/replay_import_guard.js'
import type { GameReplayStep } from '../../../../app/application/services/game_engine_types.js'
import {
  importReplayForGame,
  normalizeReplayTimeline,
} from '../../../../app/controllers/support/game_controller_replay_admin.js'
import Game from '../../../../app/domain/entities/game.js'
import { GameStatus } from '../../../../app/domain/value_objects/game_status.js'

const GAME_UUID = '11111111-1111-4111-8111-111111111111'

function makeGame(): Game {
  return Game.reconstitute(
    GAME_UUID,
    GameStatus.PAUSED,
    [
      { uuid: 'player-1', nickName: 'Player 1' },
      { uuid: 'player-2', nickName: 'Player 2' },
    ],
    {
      currentRound: 1,
      currentTurn: 0,
      eliminatedPlayers: [],
      playerHands: {},
      discardPile: [],
      deck: { remaining: 10 },
      runtime: {
        gameType: 'rock-paper-scissors',
        lobbyId: 'lobby-1',
        replayEnvelope: { signature: 'previous' },
      },
    },
    new Date('2026-06-01T10:00:00.000Z')
  )
}

function makeReplayTimeline(): GameReplayStep[] {
  return [
    {
      step: 0,
      kind: 'initial',
      recordedAt: '2026-06-01T10:00:00.000Z',
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

const acceptedDecision: ReplayImportGuardDecision = {
  allowed: true,
  verification: null,
  reason: null,
}

function makeEnvelope(payload: Record<string, unknown> = { gameId: GAME_UUID }): Record<string, unknown> {
  return {
    schemaVersion: 1,
    keyId: 'replay-v1',
    algorithm: 'sha256',
    signedAt: '2026-06-01T10:00:00.000Z',
    payload,
    signature: 'sha256:signature',
  }
}

test.group('game_controller_replay_admin', () => {
  test('normalizes valid replay timelines and rejects invalid steps', ({ assert }) => {
    const replayTimeline = makeReplayTimeline()
    const normalizedReplayTimeline = normalizeReplayTimeline(replayTimeline)

    assert.isNotNull(normalizedReplayTimeline)
    assert.lengthOf(normalizedReplayTimeline!, 1)
    assert.isNull(normalizeReplayTimeline([replayTimeline[0], null]))
  })

  test('returns not_found when the game does not exist', async ({ assert }) => {
    const result = await importReplayForGame({
      gameUuid: GAME_UUID,
      actorId: 'admin-1',
      replayTimeline: makeReplayTimeline(),
      gameRepository: {
        findByUuid: async () => null,
        save: async () => undefined,
      },
      guardVerifier: {
        verifyImport: async () => acceptedDecision,
      },
    })

    assert.deepEqual(result, { status: 'not_found' })
  })

  test('rejects invalid replay payloads before verification or persistence', async ({ assert }) => {
    let verifyCalls = 0
    let saveCalls = 0

    const result = await importReplayForGame({
      gameUuid: GAME_UUID,
      actorId: 'admin-1',
      replayTimeline: [null],
      gameRepository: {
        findByUuid: async () => makeGame(),
        save: async () => {
          saveCalls += 1
        },
      },
      guardVerifier: {
        verifyImport: async () => {
          verifyCalls += 1
          return acceptedDecision
        },
      },
    })

    assert.equal(result.status, 'invalid_payload')
    if (result.status !== 'invalid_payload') {
      throw new Error('expected invalid payload')
    }
    assert.deepInclude(result.issues, {
      path: 'replayTimeline[0]',
      code: 'expected_object',
      message: 'Expected an object',
    })
    assert.equal(verifyCalls, 0)
    assert.equal(saveCalls, 0)
  })

  test('returns verification failure without persisting game data', async ({ assert }) => {
    let saveCalls = 0

    const result = await importReplayForGame({
      gameUuid: GAME_UUID,
      actorId: 'admin-1',
      replayTimeline: makeReplayTimeline(),
      gameRepository: {
        findByUuid: async () => makeGame(),
        save: async () => {
          saveCalls += 1
        },
      },
      guardVerifier: {
        verifyImport: async () => ({
          allowed: false,
          verification: null,
          reason: 'missing_envelope',
        }),
      },
    })

    assert.deepEqual(result, {
      status: 'verification_failed',
      reason: 'missing_envelope',
    })
    assert.equal(saveCalls, 0)
  })

  test('persists imported replay metadata when verification succeeds', async ({ assert }) => {
    const replayTimeline = makeReplayTimeline()
    const normalizedReplayTimeline = normalizeReplayTimeline(replayTimeline)!
    const envelope = makeEnvelope({
      gameId: GAME_UUID,
      replayTimeline: normalizedReplayTimeline,
    })
    let savedGame: Game | null = null

    const result = await importReplayForGame({
      gameUuid: GAME_UUID,
      actorId: 'admin-1',
      replayTimeline,
      envelope,
      now: () => new Date('2026-06-01T11:30:00.000Z'),
      gameRepository: {
        findByUuid: async () => makeGame(),
        save: async (game) => {
          savedGame = game
        },
      },
      guardVerifier: {
        verifyImport: async (options) => {
          assert.equal(options.actorId, 'admin-1')
          assert.equal(options.targetId, GAME_UUID)
          assert.deepEqual(options.payload, {
            gameId: GAME_UUID,
            replayTimeline: normalizedReplayTimeline,
          })
          return acceptedDecision
        },
      },
    })

    assert.deepEqual(result, {
      status: 'imported',
      gameId: GAME_UUID,
      importedSteps: 1,
    })
    assert.isNotNull(savedGame)
    assert.deepEqual(savedGame!.gameData.runtime?.replayTimeline, normalizedReplayTimeline)
    assert.deepEqual(savedGame!.gameData.runtime?.replayEnvelope, envelope)
    assert.equal(savedGame!.gameData.runtime?.importedBy, 'admin-1')
    assert.equal(savedGame!.gameData.runtime?.importedAt, '2026-06-01T11:30:00.000Z')
  })
})
