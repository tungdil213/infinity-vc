import { test } from '@japa/runner'
import { CardTypes } from '../../../app/games/love-letter/types.js'
import {
  toActionResponsePayload,
  toGameActionsPayload,
  toGameApiPayload,
  toGamePagePayload,
  toPublicPlayersPayload,
  toSpectatorPlayerView,
} from '../../../app/presenters/game_presenter.js'
import type { GameSession } from '../../../app/application/services/game_engine_service.js'

function makeSession(): GameSession {
  return {
    gameId: 'game-1',
    lobbyId: 'lobby-1',
    gameType: 'love-letter',
    engine: {} as any,
    createdAt: new Date(),
    players: [{ id: 'user-1', name: 'User 1', isActive: true }],
    state: {
      currentPlayerId: 'user-1',
      players: [
        {
          id: 'user-1',
          name: 'User 1',
          isActive: true,
          isEliminated: false,
          isProtected: false,
          hand: [CardTypes.GUARD],
          discardPile: [CardTypes.GUARD],
          tokensOfAffection: 1,
        },
      ],
      phase: 'play',
      round: 3,
      deck: [CardTypes.PRIEST],
      isFinished: false,
      winnerId: null,
    } as any,
  }
}

test.group('game_presenter', () => {
  test('toGamePagePayload should expose gameType for frontend routing', ({ assert }) => {
    const session = makeSession()

    const payload = toGamePagePayload({
      session,
      playerView: { foo: 'bar' },
      availableActions: ['draw_card'],
      user: { uuid: 'user-1', nickName: 'User 1' },
    })

    assert.equal(payload.gameType, 'love-letter')
  })

  test('toGamePagePayload should normalize raw Love Letter player views for the frontend', ({
    assert,
  }) => {
    const session = makeSession()
    const rawPlayerView = {
      playerId: 'user-1',
      isMyTurn: true,
      availableActions: ['play_card'],
      state: {
        phase: 'play',
        currentPlayerId: 'user-1',
        round: 3,
        turn: 4,
        isFinished: false,
        deck: [CardTypes.PRIEST, CardTypes.HANDMAID],
        players: [
          {
            id: 'user-1',
            name: 'User 1',
            isActive: true,
            isEliminated: false,
            isProtected: false,
            hand: [CardTypes.GUARD, CardTypes.PRIEST],
            discardPile: [CardTypes.BARON],
            tokensOfAffection: 1,
          },
          {
            id: 'user-2',
            name: 'User 2',
            isActive: true,
            isEliminated: false,
            isProtected: false,
            hand: [CardTypes.PRINCESS],
            discardPile: [],
            tokensOfAffection: 0,
          },
        ],
      },
    }

    const payload = toGamePagePayload({
      session,
      playerView: rawPlayerView,
      availableActions: ['play_card'],
      user: { uuid: 'user-1', nickName: 'User 1' },
      gamePresentation: { playerView: 'hidden-hand-player-list' },
    }) as any

    assert.deepEqual(payload.playerView.state.myHand, [CardTypes.GUARD, CardTypes.PRIEST])
    assert.equal(payload.playerView.state.deckCount, 2)
    assert.equal(payload.playerView.state.players[0].handCount, 2)
    assert.equal(payload.playerView.state.players[1].handCount, 1)
    assert.isUndefined(payload.playerView.state.players[1].hand)
    assert.equal(payload.playerView.state.players[0].discardPile[0].type, CardTypes.BARON)
    assert.equal(payload.playerView.state.players[0].isMe, true)
    assert.equal(payload.playerView.state.players[0].isCurrentPlayer, true)
  })

  test('game payloads should include runtimeStatus when provided', ({ assert }) => {
    const session = makeSession()
    const runtimeStatus = { source: 'restored' as const, persisted: true, inMemory: true }

    const pagePayload = toGamePagePayload({
      session,
      playerView: { foo: 'bar' },
      availableActions: [],
      user: { uuid: 'user-1', nickName: 'User 1' },
      runtimeStatus,
    })

    const apiPayload = toGameApiPayload({
      session,
      playerView: { foo: 'bar' },
      availableActions: [],
      runtimeStatus,
    })

    assert.deepEqual(pagePayload.runtimeStatus, runtimeStatus)
    assert.deepEqual(apiPayload.runtimeStatus, runtimeStatus)
  })

  test('game payloads should include replay timeline when provided', ({ assert }) => {
    const session = makeSession()
    const replayTimeline = [
      {
        step: 0,
        kind: 'initial' as const,
        recordedAt: new Date().toISOString(),
        events: [],
        snapshot: {
          phase: 'play',
          round: 1,
          turn: 1,
          isFinished: false,
          winnerId: null,
          currentPlayerId: 'user-1',
          players: [],
        },
      },
    ]

    const pagePayload = toGamePagePayload({
      session,
      playerView: { foo: 'bar' },
      availableActions: [],
      user: { uuid: 'user-1', nickName: 'User 1' },
      replayTimeline,
    })

    const apiPayload = toGameApiPayload({
      session,
      playerView: { foo: 'bar' },
      availableActions: [],
      replayTimeline,
    })

    assert.deepEqual(pagePayload.replayTimeline, replayTimeline)
    assert.deepEqual(apiPayload.replayTimeline, replayTimeline)
  })

  test('toGameActionsPayload should expose turn state', ({ assert }) => {
    const session = makeSession()

    const payload = toGameActionsPayload({
      session,
      availableActions: ['draw_card'],
      currentUserUuid: 'user-1',
    })

    assert.deepEqual(payload, {
      availableActions: ['draw_card'],
      isMyTurn: true,
      phase: 'play',
      isSpectator: false,
    })
  })

  test('toActionResponsePayload should map action result fields', ({ assert }) => {
    const payload = toActionResponsePayload({
      actionResult: {
        success: true,
        newState: { isFinished: true, winnerId: 'user-1' } as any,
        events: [{ type: 'card_played', payload: { card: 'guard' } }],
      },
      playerView: { me: true },
      availableActions: [],
    })

    assert.equal(payload.success, true)
    assert.equal(payload.isFinished, true)
    assert.equal(payload.winnerId, 'user-1')
    assert.lengthOf(payload.events || [], 1)
    assert.isUndefined(payload.events?.[0]?.payload)
  })

  test('toActionResponsePayload should include debug payload for admin views', ({ assert }) => {
    const payload = toActionResponsePayload({
      actionResult: {
        success: true,
        newState: { isFinished: false, winnerId: null } as any,
        events: [{ type: 'card_played', payload: { card: 'guard' } }],
      },
      playerView: { me: true },
      availableActions: [],
      includeDebugPayload: true,
    })

    assert.deepEqual(payload.events?.[0]?.payload, { card: 'guard' })
  })

  test('toActionResponsePayload should normalize raw hidden-hand player views when presentation requires it', ({
    assert,
  }) => {
    const payload = toActionResponsePayload({
      actionResult: {
        success: true,
        newState: { isFinished: false, winnerId: null } as any,
        events: [],
      },
      playerView: {
        playerId: 'user-1',
        isMyTurn: true,
        availableActions: ['play_card'],
        state: {
          phase: 'play',
          currentPlayerId: 'user-1',
          round: 1,
          turn: 2,
          isFinished: false,
          deck: [CardTypes.PRIEST],
          players: [
            {
              id: 'user-1',
              name: 'User 1',
              isActive: true,
              isEliminated: false,
              isProtected: false,
              hand: [CardTypes.GUARD],
              discardPile: [],
              tokensOfAffection: 0,
            },
          ],
        },
      },
      availableActions: [],
      gamePresentation: { playerView: 'hidden-hand-player-list' },
    }) as any

    assert.deepEqual(payload.playerView.state.myHand, [CardTypes.GUARD])
    assert.equal(payload.playerView.state.deckCount, 1)
    assert.equal(payload.playerView.state.players[0].handCount, 1)
  })

  test('toActionResponsePayload should keep opponent hands hidden after a Love Letter action', ({
    assert,
  }) => {
    const payload = toActionResponsePayload({
      actionResult: {
        success: true,
        newState: { isFinished: false, winnerId: null } as any,
        events: [{ type: 'lli.card_played', payload: { cardType: CardTypes.GUARD } }],
      },
      playerView: {
        playerId: 'user-1',
        isMyTurn: false,
        availableActions: ['draw_card'],
        state: {
          phase: 'draw',
          currentPlayerId: 'user-2',
          round: 1,
          turn: 2,
          isFinished: false,
          deck: [CardTypes.PRIEST, CardTypes.HANDMAID],
          players: [
            {
              id: 'user-1',
              name: 'User 1',
              isActive: true,
              isEliminated: false,
              isProtected: false,
              hand: [CardTypes.BARON],
              discardPile: [CardTypes.GUARD],
              tokensOfAffection: 0,
            },
            {
              id: 'user-2',
              name: 'User 2',
              isActive: true,
              isEliminated: false,
              isProtected: false,
              hand: [CardTypes.PRINCESS],
              discardPile: [],
              tokensOfAffection: 0,
            },
          ],
        },
      },
      availableActions: ['draw_card'],
      gamePresentation: { playerView: 'hidden-hand-player-list' },
    }) as any

    assert.deepEqual(payload.playerView.state.myHand, [CardTypes.BARON])
    assert.equal(payload.playerView.state.players[0].handCount, 1)
    assert.equal(payload.playerView.state.players[1].handCount, 1)
    assert.isUndefined(payload.playerView.state.players[0].hand)
    assert.isUndefined(payload.playerView.state.players[1].hand)
  })

  test('toPublicPlayersPayload should serialize discard metadata from cards catalog', ({
    assert,
  }) => {
    const session = makeSession()

    const payload = toPublicPlayersPayload({ session, currentUserUuid: 'user-1' })

    assert.equal(payload.players[0].discardPile[0].type, CardTypes.GUARD)
    assert.equal(payload.players[0].discardPile[0].name, CardTypes.GUARD)
    assert.equal(payload.players[0].isMe, true)
    assert.equal(payload.deckCount, 1)
  })

  test('toSpectatorPlayerView should hide actions while preserving public state', ({ assert }) => {
    const session = makeSession()

    const spectatorView = toSpectatorPlayerView({
      session,
      currentUserUuid: 'spectator-1',
    }) as any

    assert.deepEqual(spectatorView.availableActions, [])
    assert.equal(spectatorView.isMyTurn, false)
    assert.equal(spectatorView.state.players[0].isMe, false)
    assert.equal(spectatorView.state.players[0].handCount, 1)
    assert.deepEqual(spectatorView.state.myHand, [])
  })
})
