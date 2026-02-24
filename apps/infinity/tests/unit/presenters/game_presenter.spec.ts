import { test } from '@japa/runner'
import { CardTypes } from '../../../app/games/love-letter/types.js'
import {
  toActionResponsePayload,
  toGameActionsPayload,
  toGamePagePayload,
  toPublicPlayersPayload,
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
})
