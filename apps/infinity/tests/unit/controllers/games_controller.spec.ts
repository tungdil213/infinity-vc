import { test } from '@japa/runner'
import GamesController from '../../../app/controllers/games_controller.js'
import Game from '../../../app/domain/entities/game.js'
import { GameStatus } from '../../../app/domain/value_objects/game_status.js'

const ACTIVE_GAME_UUID = '11111111-1111-4111-8111-111111111111'
const OTHER_GAME_UUID = '22222222-2222-4222-8222-222222222222'

function makeGame(input?: {
  uuid?: string
  status?: GameStatus
  playerUuids?: string[]
  startedAt?: Date
  lobbyId?: string
  gameType?: string
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

test.group('GamesController', () => {
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
})
