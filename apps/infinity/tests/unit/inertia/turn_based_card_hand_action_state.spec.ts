import { test } from '@japa/runner'
import { resolveTurnBasedCardHandActionState } from '../../../inertia/games/turn_based_card_hand_action_state.js'

const players = [
  {
    id: 'me',
    isProtected: false,
    isEliminated: false,
    isMe: true,
  },
  {
    id: 'opponent-1',
    isProtected: false,
    isEliminated: false,
    isMe: false,
  },
  {
    id: 'opponent-2',
    isProtected: true,
    isEliminated: false,
    isMe: false,
  },
] as const

test.group('turn_based_card_hand_action_state', () => {
  test('should require a target and a guess for guard when a legal target exists', ({ assert }) => {
    const state = resolveTurnBasedCardHandActionState({
      canPlay: true,
      selectedCard: 'guard',
      selectedTarget: null,
      selectedGuess: null,
      players,
    })

    assert.deepEqual(state.legalTargetIds, ['opponent-1'])
    assert.equal(state.requiresTarget, true)
    assert.equal(state.requiresGuess, true)
    assert.equal(state.canAttemptPlay, false)
    assert.equal(state.helperText, 'Select a target player.')
  })

  test('should allow guard once both target and guess are selected', ({ assert }) => {
    const state = resolveTurnBasedCardHandActionState({
      canPlay: true,
      selectedCard: 'guard',
      selectedTarget: 'opponent-1',
      selectedGuess: 'king',
      players,
    })

    assert.equal(state.canAttemptPlay, true)
    assert.equal(state.helperText, null)
  })

  test('should allow guard without target or guess when every opponent is protected or eliminated', ({
    assert,
  }) => {
    const state = resolveTurnBasedCardHandActionState({
      canPlay: true,
      selectedCard: 'guard',
      selectedTarget: null,
      selectedGuess: null,
      players: players.map((player) => (player.isMe ? player : { ...player, isProtected: true })),
    })

    assert.deepEqual(state.legalTargetIds, [])
    assert.equal(state.requiresTarget, false)
    assert.equal(state.requiresGuess, false)
    assert.equal(state.canAttemptPlay, true)
    assert.equal(state.helperText, 'No legal targets: Guard can be discarded without a guess.')
  })

  test('should allow Prince to target yourself', ({ assert }) => {
    const state = resolveTurnBasedCardHandActionState({
      canPlay: true,
      selectedCard: 'prince',
      selectedTarget: null,
      selectedGuess: null,
      players,
    })

    assert.deepEqual(state.legalTargetIds, ['me', 'opponent-1'])
    assert.equal(state.requiresTarget, false)
  })
})
