import { test } from '@japa/runner'
import { createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useGamePageController } from '../../../inertia/hooks/use_game_page_controller.js'
import type { PlayerViewState, ReplayStep } from '../../../inertia/games/game_renderer_types.js'

function makePlayerView(overrides?: Partial<PlayerViewState>): PlayerViewState {
  return {
    playerId: overrides?.playerId ?? 'player-1',
    isMyTurn: overrides?.isMyTurn ?? true,
    availableActions: overrides?.availableActions ?? ['draw_card', 'play_card'],
    state: {
      phase: overrides?.state?.phase ?? 'play',
      currentPlayerId: overrides?.state?.currentPlayerId ?? 'player-1',
      round: overrides?.state?.round ?? 2,
      turn: overrides?.state?.turn ?? 3,
      isFinished: overrides?.state?.isFinished ?? false,
      winnerId: overrides?.state?.winnerId,
      winnerIds: overrides?.state?.winnerIds,
      loserId: overrides?.state?.loserId,
      myHand: overrides?.state?.myHand ?? ['guard', 'priest'],
      deckCount: overrides?.state?.deckCount ?? 8,
      players: overrides?.state?.players ?? [
        {
          id: 'player-1',
          name: 'You',
          isMe: true,
        },
        {
          id: 'player-2',
          name: 'Nebula',
          isMe: false,
        },
      ],
      scores: overrides?.state?.scores,
      roundChoices: overrides?.state?.roundChoices,
      rounds: overrides?.state?.rounds,
      roundsToWin: overrides?.state?.roundsToWin,
    },
  }
}

function makeReplayStep(overrides?: Partial<ReplayStep>): ReplayStep {
  return {
    step: overrides?.step ?? 1,
    kind: overrides?.kind ?? 'action',
    recordedAt: overrides?.recordedAt ?? '2026-04-11T12:00:00.000Z',
    actorId: overrides?.actorId ?? 'player-1',
    actionType: overrides?.actionType ?? 'play_card',
    actionPayload: overrides?.actionPayload ?? {},
    events: overrides?.events ?? [],
    snapshot: {
      phase: overrides?.snapshot?.phase ?? 'play',
      round: overrides?.snapshot?.round ?? 2,
      turn: overrides?.snapshot?.turn ?? 3,
      isFinished: overrides?.snapshot?.isFinished ?? false,
      winnerId: overrides?.snapshot?.winnerId ?? null,
      currentPlayerId: overrides?.snapshot?.currentPlayerId ?? 'player-2',
      players: overrides?.snapshot?.players ?? [
        {
          id: 'player-1',
          name: 'You',
          isActive: true,
          isEliminated: false,
          isProtected: false,
          handCount: 1,
          tokensOfAffection: 0,
        },
        {
          id: 'player-2',
          name: 'Nebula',
          isActive: true,
          isEliminated: false,
          isProtected: false,
          handCount: 1,
          tokensOfAffection: 0,
        },
      ],
      scores: overrides?.snapshot?.scores,
      roundChoices: overrides?.snapshot?.roundChoices,
      rounds: overrides?.snapshot?.rounds,
    },
  }
}

function renderGamePageController(args: Parameters<typeof useGamePageController>[0]) {
  let capturedResult: ReturnType<typeof useGamePageController> | null = null
  const originalConsoleWarn = console.warn
  console.warn = () => {}

  function Harness() {
    capturedResult = useGamePageController(args)
    return createElement('div')
  }

  try {
    renderToStaticMarkup(createElement(Harness))
  } finally {
    console.warn = originalConsoleWarn
  }

  return capturedResult
}

test.group('use_game_page_controller', () => {
  test('assembles the consumer contract for the game page initial render', ({ assert }) => {
    const playerView = makePlayerView()
    const replayTimeline = [
      makeReplayStep({
        step: 1,
        actionType: 'draw_card',
        snapshot: {
          phase: 'draw',
          round: 2,
          turn: 2,
          isFinished: false,
          winnerId: null,
          currentPlayerId: 'player-1',
          players: [
            {
              id: 'player-1',
              name: 'You',
              isActive: true,
              isEliminated: false,
              isProtected: false,
              handCount: 2,
              tokensOfAffection: 0,
            },
            {
              id: 'player-2',
              name: 'Nebula',
              isActive: true,
              isEliminated: false,
              isProtected: false,
              handCount: 1,
              tokensOfAffection: 0,
            },
          ],
        },
      }),
      makeReplayStep({
        step: 2,
        actionType: 'card.played',
        events: [
          {
            type: 'card.played',
            payload: {
              playerId: 'player-1',
              targetPlayerId: 'player-2',
            },
          },
        ],
      }),
    ]

    const result = renderGamePageController({
      gameId: 'game-1',
      user: {
        uuid: 'player-1',
        nickName: 'Captain',
        role: 'ADMIN',
      },
      playerView,
      initialActions: ['draw_card', 'play_card'],
      initialReplayTimeline: replayTimeline,
      isFinished: false,
      isSpectator: false,
      pollingIntervalMs: 5000,
      showReplayDiff: null,
    })

    assert.exists(result)
    assert.deepEqual(result?.gameState, playerView)
    assert.equal(result?.isConnected, false)
    assert.equal(result?.isLoading, false)
    assert.deepEqual(result?.notifications, [])
    assert.deepEqual(result?.myHand, ['guard', 'priest'])
    assert.equal(result?.canDraw, true)
    assert.equal(result?.canPlay, true)
    assert.equal(result?.canSubmitMove, false)
    assert.equal(result?.canViewDebugPayload, true)
    assert.equal(result?.isMyTurn, true)
    assert.equal(result?.phase, 'play')
    assert.equal(result?.replayTimeline.length, 2)
    assert.equal(result?.replayCursor, 1)
    assert.equal(result?.isReplayPinnedToLatest, true)
    assert.deepEqual(result?.activeReplayStep, replayTimeline[1])
    assert.equal(result?.getPlayerLabel('player-2'), 'Nebula')
    assert.equal(
      result?.describeReplayEvent({
        type: 'card.played',
        payload: {
          playerId: 'player-1',
          targetPlayerId: 'player-2',
        },
      }),
      'card.played by You targeting Nebula'
    )
    assert.equal(result?.formatDebugPayload(undefined), 'No debug payload')
    assert.isFunction(result?.onDraw)
    assert.isFunction(result?.onSubmitMove)
    assert.isFunction(result?.onPlayCard)
    assert.isFunction(result?.onSelectCard)
    assert.isFunction(result?.moveReplayCursor)
    assert.isTrue(isValidElement(result?.renderReplayDiff()))
  })

  test('preserves consumer-facing toggles for spectator mode and replay diff visibility', ({
    assert,
  }) => {
    const result = renderGamePageController({
      gameId: 'game-2',
      user: {
        uuid: 'player-9',
        nickName: 'Watcher',
        role: 'PLAYER',
      },
      playerView: makePlayerView({
        isMyTurn: false,
        state: {
          phase: 'waiting',
          currentPlayerId: 'player-1',
          round: 1,
          turn: 1,
          isFinished: false,
          players: [
            {
              id: 'player-9',
              name: 'Watcher',
              isMe: true,
            },
          ],
        },
      }),
      initialActions: ['draw_card', 'play_card', 'submit_move'],
      initialReplayTimeline: [],
      isFinished: false,
      isSpectator: true,
      pollingIntervalMs: 2000,
      showReplayDiff: false,
    })

    assert.exists(result)
    assert.equal(result?.canDraw, false)
    assert.equal(result?.canPlay, false)
    assert.equal(result?.canSubmitMove, false)
    assert.equal(result?.canViewDebugPayload, false)
    assert.equal(result?.replayCursor, 0)
    assert.isNull(result?.activeReplayStep)
    assert.isNull(result?.renderReplayDiff())
  })
})
