import { test } from '@japa/runner'
import {
  buildPersistedGameFromSession,
  extractPersistedGameSnapshot,
  extractPersistedReplayEnvelope,
  extractPersistedReplayTimeline,
} from '../../../../app/controllers/support/game_controller_persistence.js'
import Game from '../../../../app/domain/entities/game.js'
import { GameStatus } from '../../../../app/domain/value_objects/game_status.js'
import type {
  GameReplayStep,
  GameSession,
} from '../../../../app/application/services/game_engine_types.js'

function makeGame(input?: {
  uuid?: string
  runtimeOverrides?: Record<string, unknown>
  gameDataOverrides?: Record<string, unknown>
}) {
  return Game.reconstitute(
    input?.uuid ?? 'game-1',
    GameStatus.IN_PROGRESS,
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
        persistedAt: '2026-04-10T09:00:00.000Z',
        ...(input?.runtimeOverrides ?? {}),
      },
      ...(input?.gameDataOverrides ?? {}),
    },
    new Date('2026-04-10T09:00:00.000Z')
  )
}

function makeSession(input?: {
  stateOverrides?: Record<string, unknown>
  timeline?: GameReplayStep[]
  createdAt?: Date
}) {
  const session: GameSession = {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    gameType: 'love-letter',
    engine: {} as any,
    state: {
      round: 2,
      turn: 1,
      isFinished: false,
      winnerId: null,
      settings: { maxTokens: 7 },
      deck: ['guard', 'priest', 'baron'],
      publicDiscards: ['king'],
      players: [
        {
          id: 'player-1',
          hand: ['guard'],
          isEliminated: false,
        },
        {
          id: 'player-2',
          hand: ['priest', 'baron'],
          isEliminated: true,
        },
      ],
      ...(input?.stateOverrides ?? {}),
    } as any,
    players: [
      { id: 'player-1', name: 'Alice', isActive: true },
      { id: 'player-2', name: 'Bob', isActive: false },
    ],
    createdAt: input?.createdAt ?? new Date('2026-04-10T09:00:00.000Z'),
    timeline: input?.timeline,
  }

  return session
}

test.group('game_controller_persistence', () => {
  test('extracts persisted runtime snapshot and replay timeline', ({ assert }) => {
    const game = makeGame({
      runtimeOverrides: {
        settings: { maxRounds: 3 },
        engineState: {
          phase: 'in_progress',
          players: [{ id: 'player-1' }],
        },
        replayTimeline: [
          {
            step: 0,
            kind: 'initial',
            recordedAt: '2026-04-10T09:00:00.000Z',
            events: [],
            snapshot: {
              phase: 'setup',
              round: 1,
              turn: 0,
              isFinished: false,
              winnerId: null,
              currentPlayerId: 'player-1',
              players: [
                {
                  id: 'player-1',
                  name: 'Player 1',
                  isActive: true,
                  isEliminated: false,
                  isProtected: false,
                  handCount: 1,
                  tokensOfAffection: 0,
                },
              ],
            },
          },
        ],
      },
    })

    const snapshot = extractPersistedGameSnapshot(game)

    assert.isNotNull(snapshot)
    assert.equal(snapshot!.gameType, 'rock-paper-scissors')
    assert.equal(snapshot!.lobbyId, 'lobby-1')
    assert.deepEqual(snapshot!.settings, { maxRounds: 3 })
    assert.deepEqual(snapshot!.engineState, {
      phase: 'in_progress',
      players: [{ id: 'player-1' }],
    })
    assert.lengthOf(snapshot!.replayTimeline, 1)
    assert.equal(snapshot!.replayTimeline[0].snapshot.phase, 'setup')
  })

  test('falls back to legacy engine state and restored lobby id', ({ assert }) => {
    const game = makeGame({
      uuid: 'legacy-game',
      runtimeOverrides: {
        lobbyId: null,
        engineState: null,
      },
      gameDataOverrides: {
        phase: 'legacy',
        players: [{ id: 'player-1' }],
      },
    })

    const snapshot = extractPersistedGameSnapshot(game)

    assert.isNotNull(snapshot)
    assert.equal(snapshot!.lobbyId, 'restored-legacy-game')
    assert.equal(snapshot!.engineState.phase, 'legacy')
    assert.deepEqual(snapshot!.engineState.players, [{ id: 'player-1' }])
  })

  test('extracts replay envelope and rejects an invalid persisted replay timeline', ({ assert }) => {
    const game = makeGame({
      runtimeOverrides: {
        replayEnvelope: { signature: 'sig-1' },
        replayTimeline: [
          {
            step: 1,
            kind: 'action',
            recordedAt: '2026-04-10T09:05:00.000Z',
            actorId: 'player-1',
            actionType: 'play_card',
            actionPayload: { cardType: 'guard' },
            events: [{ type: 'card_played', payload: { cardType: 'guard' } }],
            snapshot: {
              phase: 'turn',
              round: 2,
              turn: 1,
              isFinished: false,
              winnerId: null,
              currentPlayerId: 'player-2',
              players: [
                {
                  id: 'player-1',
                  name: 'Player 1',
                  isActive: true,
                  isEliminated: false,
                  isProtected: false,
                  handCount: 1,
                  tokensOfAffection: 0,
                },
              ],
              scores: { 'player-1': 2 },
              roundChoices: { 'player-1': 'guard' },
            },
          },
          null,
        ],
      },
    })

    const replayEnvelope = extractPersistedReplayEnvelope(game)
    const replayTimeline = extractPersistedReplayTimeline(game)

    assert.deepEqual(replayEnvelope, { signature: 'sig-1' })
    assert.deepEqual(replayTimeline, [])
  })

  test('builds a persisted game aggregate from a live runtime session', ({ assert }) => {
    const persistedAt = new Date('2026-04-10T09:30:00.000Z')
    const timeline = [
      {
        step: 0,
        kind: 'initial' as const,
        recordedAt: '2026-04-10T09:05:00.000Z',
        events: [],
        snapshot: {
          phase: 'setup',
          round: 1,
          turn: 0,
          isFinished: false,
          winnerId: null,
          currentPlayerId: 'player-1',
          players: [],
        },
      },
    ]

    const persistedGame = buildPersistedGameFromSession({
      session: makeSession({ timeline }),
      runtimeStatus: 'HOT',
      replayEnvelope: { signature: 'signed-1' },
      persistedAt,
    })

    assert.equal(persistedGame.status, GameStatus.IN_PROGRESS)
    assert.equal(persistedGame.finishedAt, undefined)
    assert.deepEqual(persistedGame.players, [
      { uuid: 'player-1', nickName: 'Alice' },
      { uuid: 'player-2', nickName: 'Bob' },
    ])
    assert.deepEqual(persistedGame.gameData.playerHands, {
      'player-1': ['guard'],
      'player-2': ['priest', 'baron'],
    })
    assert.deepEqual(persistedGame.gameData.discardPile, ['king'])
    assert.deepEqual(persistedGame.gameData.eliminatedPlayers, ['player-2'])
    assert.deepEqual(persistedGame.gameData.runtime, {
      gameType: 'love-letter',
      lobbyId: 'lobby-1',
      settings: { maxTokens: 7 },
      engineState: {
        round: 2,
        turn: 1,
        isFinished: false,
        winnerId: null,
        settings: { maxTokens: 7 },
        deck: ['guard', 'priest', 'baron'],
        publicDiscards: ['king'],
        players: [
          { id: 'player-1', hand: ['guard'], isEliminated: false },
          { id: 'player-2', hand: ['priest', 'baron'], isEliminated: true },
        ],
      },
      replayTimeline: timeline,
      replayEnvelope: { signature: 'signed-1' },
      persistedAt: persistedAt.toISOString(),
      runtimeStatus: 'HOT',
      abandonReason: undefined,
    })
  })

  test('builds an abandoned persisted game when the controller overrides status', ({ assert }) => {
    const persistedAt = new Date('2026-04-10T10:00:00.000Z')

    const persistedGame = buildPersistedGameFromSession({
      session: makeSession({
        stateOverrides: {
          deck: undefined,
          deckCount: 4,
          publicDiscards: undefined,
          discardPile: ['countess'],
        },
      }),
      runtimeStatus: 'RESTORED',
      persistedAt,
      statusOverride: GameStatus.ABANDONED,
      abandonReason: 'player_left',
    })

    assert.equal(persistedGame.status, GameStatus.ABANDONED)
    assert.isDefined(persistedGame.finishedAt)
    assert.equal(persistedGame.finishedAt?.toISOString(), persistedAt.toISOString())
    assert.deepEqual(persistedGame.gameData.deck, { remaining: 4 })
    assert.deepEqual(persistedGame.gameData.discardPile, ['countess'])
    assert.equal(persistedGame.gameData.runtime?.runtimeStatus, 'RESTORED')
    assert.equal(persistedGame.gameData.runtime?.abandonReason, 'player_left')
  })
})
