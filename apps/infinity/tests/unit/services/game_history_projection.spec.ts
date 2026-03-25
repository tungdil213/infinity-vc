import { test } from '@japa/runner'
import {
  projectActiveGames,
  projectGameHistoryItem,
  projectGameStats,
  type GameProjectionInput,
} from '@infinity.dev/game-runtime-session'

function makeProjection(input?: {
  uuid?: string
  status?: string
  winner?: string | null
  startedAt?: Date
  playerUuids?: string[]
  gameType?: string
  lobbyId?: string | null
}): GameProjectionInput {
  const playerUuids = input?.playerUuids ?? ['player-1', 'player-2']

  return {
    uuid: input?.uuid ?? 'game-1',
    status: input?.status ?? 'IN_PROGRESS',
    players: playerUuids.map((uuid) => ({ uuid })),
    gameData: {
      winner: input?.winner ?? null,
      runtime: {
        gameType: input?.gameType ?? 'rock-paper-scissors',
        lobbyId: input?.lobbyId ?? 'lobby-1',
        persistedAt: '2026-03-25T09:00:00.000Z',
      },
    },
    startedAt: input?.startedAt ?? new Date('2026-03-20T09:00:00.000Z'),
    finishedAt: null,
    durationMs: 120_000,
  }
}

test.group('game_history_projection', () => {
  test('projectActiveGames returns only active statuses sorted by startedAt desc', ({ assert }) => {
    const activeGames = projectActiveGames([
      makeProjection({
        uuid: 'older-paused',
        status: 'PAUSED',
        startedAt: new Date('2026-03-10T09:00:00.000Z'),
        lobbyId: 'lobby-older',
      }),
      makeProjection({
        uuid: 'newer-in-progress',
        status: 'IN_PROGRESS',
        startedAt: new Date('2026-03-20T09:00:00.000Z'),
        lobbyId: 'lobby-newer',
      }),
      makeProjection({
        uuid: 'finished',
        status: 'FINISHED',
      }),
    ])

    assert.lengthOf(activeGames, 2)
    assert.equal(activeGames[0].gameUuid, 'newer-in-progress')
    assert.equal(activeGames[0].status, 'IN_PROGRESS')
    assert.equal(activeGames[0].lobbyUuid, 'lobby-newer')
    assert.equal(activeGames[1].gameUuid, 'older-paused')
    assert.equal(activeGames[1].status, 'PAUSED')
    assert.equal(activeGames[1].lobbyUuid, 'lobby-older')
  })

  test('projectGameHistoryItem computes result from winner and status', ({ assert }) => {
    const win = projectGameHistoryItem(
      makeProjection({
        uuid: 'game-win',
        status: 'FINISHED',
        winner: 'player-1',
      }),
      'player-1'
    )
    const loss = projectGameHistoryItem(
      makeProjection({
        uuid: 'game-loss',
        status: 'FINISHED',
        winner: 'player-2',
      }),
      'player-1'
    )
    const draw = projectGameHistoryItem(
      makeProjection({
        uuid: 'game-draw',
        status: 'FINISHED',
        winner: null,
      }),
      'player-1'
    )
    const abandoned = projectGameHistoryItem(
      makeProjection({
        uuid: 'game-abandoned',
        status: 'ABANDONED',
      }),
      'player-1'
    )

    assert.equal(win.result, 'win')
    assert.equal(loss.result, 'loss')
    assert.equal(draw.result, 'draw')
    assert.equal(abandoned.result, 'abandoned')
  })

  test('projectGameStats computes totals and win rate on completed games', ({ assert }) => {
    const stats = projectGameStats(
      [
        makeProjection({
          uuid: 'g1',
          status: 'FINISHED',
          winner: 'player-1',
        }),
        makeProjection({
          uuid: 'g2',
          status: 'FINISHED',
          winner: 'player-2',
        }),
        makeProjection({
          uuid: 'g3',
          status: 'FINISHED',
          winner: null,
        }),
        makeProjection({
          uuid: 'g4',
          status: 'ABANDONED',
        }),
        makeProjection({
          uuid: 'g5',
          status: 'IN_PROGRESS',
        }),
      ],
      'player-1'
    )

    assert.equal(stats.totalGames, 5)
    assert.equal(stats.completedGames, 4)
    assert.equal(stats.activeGames, 1)
    assert.equal(stats.wins, 1)
    assert.equal(stats.losses, 1)
    assert.equal(stats.draws, 1)
    assert.equal(stats.abandoned, 1)
    assert.equal(stats.winRate, 0.25)
  })
})
