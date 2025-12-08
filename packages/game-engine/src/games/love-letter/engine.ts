import type { Result } from '@tyfo.dev/events'
import { BaseGameEngine } from '../../core/engine.js'
import type {
  IGameConfig,
  IPlayer,
  IActionResult,
  IGameMetadata,
  IGameEvent,
} from '../../core/types.js'
import type {
  ILoveLetterState,
  ILoveLetterAction,
  ILoveLetterPlayer,
  CardType,
  PlayCardPayload,
} from './types.js'
import { CardTypes, Cards, LoveLetterActionTypes } from './types.js'

/**
 * Love Letter game engine
 */
export class LoveLetterEngine extends BaseGameEngine<ILoveLetterState, ILoveLetterAction> {
  readonly metadata: IGameMetadata = {
    gameType: 'love-letter',
    version: '1.0.0',
    description: 'A game of risk, deduction, and luck for 2-4 players',
    minPlayers: 2,
    maxPlayers: 4,
    estimatedDuration: '20 minutes',
    complexity: 'simple',
  }

  initialize(players: IPlayer[], config?: Partial<IGameConfig>): Result<ILoveLetterState, Error> {
    if (players.length < 2 || players.length > 4) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error('Love Letter requires 2-4 players'),
      } as Result<ILoveLetterState, Error>
    }

    // Create deck
    const deck = this.createDeck()
    this.shuffleDeck(deck)

    // Set aside card(s)
    const setAsideCard = deck.pop()!
    const publicDiscards: CardType[] = []

    // In 2-player game, 3 cards are revealed
    if (players.length === 2) {
      for (let i = 0; i < 3; i++) {
        publicDiscards.push(deck.pop()!)
      }
    }

    // Create players with initial hand
    const gamePlayers: ILoveLetterPlayer[] = players.map((p) => ({
      ...p,
      hand: [deck.pop()!],
      discardPile: [],
      isEliminated: false,
      isProtected: false,
      tokensOfAffection: 0,
    }))

    // Determine tokens needed to win based on player count
    const tokensToWin = this.getTokensToWin(players.length)

    const state: ILoveLetterState = {
      gameId: crypto.randomUUID(),
      phase: 'draw',
      currentPlayerId: gamePlayers[0].id,
      players: gamePlayers,
      deck,
      setAsideCard,
      publicDiscards,
      round: 1,
      turn: 1,
      isFinished: false,
      winnerId: null,
      lastAction: null,
      tokensToWin,
    }

    return {
      isSuccess: true,
      isFailure: false,
      value: state,
    } as Result<ILoveLetterState, Error>
  }

  protected validateActionSpecific(
    state: ILoveLetterState,
    action: ILoveLetterAction
  ): Result<void, Error> {
    const player = state.players.find((p) => p.id === action.playerId)
    if (!player) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error('Player not found'),
      } as Result<void, Error>
    }

    if (player.isEliminated) {
      return {
        isSuccess: false,
        isFailure: true,
        error: new Error('Player is eliminated'),
      } as Result<void, Error>
    }

    if (action.type === LoveLetterActionTypes.PLAY_CARD) {
      const payload = action.payload
      if (!player.hand.includes(payload.cardType)) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error('Card not in hand'),
        } as Result<void, Error>
      }

      // Countess must be played if King or Prince in hand
      if (
        player.hand.includes(CardTypes.COUNTESS) &&
        (player.hand.includes(CardTypes.KING) || player.hand.includes(CardTypes.PRINCE)) &&
        payload.cardType !== CardTypes.COUNTESS
      ) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error('Countess must be discarded when holding King or Prince'),
        } as Result<void, Error>
      }
    }

    return {
      isSuccess: true,
      isFailure: false,
      value: undefined,
    } as Result<void, Error>
  }

  executeAction(
    state: ILoveLetterState,
    action: ILoveLetterAction
  ): Result<IActionResult<ILoveLetterState>, Error> {
    const events: IGameEvent[] = []
    let newState = { ...state }

    switch (action.type) {
      case LoveLetterActionTypes.DRAW_CARD:
        newState = this.handleDrawCard(newState, action.playerId, events)
        break

      case LoveLetterActionTypes.PLAY_CARD:
        newState = this.handlePlayCard(newState, action.playerId, action.payload, events)
        break

      default:
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Unknown action type: ${action.type}`),
        } as Result<IActionResult<ILoveLetterState>, Error>
    }

    // Check for round/game end
    newState = this.checkRoundEnd(newState, events)

    return {
      isSuccess: true,
      isFailure: false,
      value: {
        success: true,
        newState,
        events,
      },
    } as Result<IActionResult<ILoveLetterState>, Error>
  }

  getAvailableActions(state: ILoveLetterState, playerId: string): string[] {
    if (state.currentPlayerId !== playerId) return []

    const player = state.players.find((p) => p.id === playerId)
    if (!player || player.isEliminated) return []

    switch (state.phase) {
      case 'draw':
        return [LoveLetterActionTypes.DRAW_CARD]
      case 'play':
        return [LoveLetterActionTypes.PLAY_CARD]
      default:
        return []
    }
  }

  protected filterStateForPlayer(
    state: ILoveLetterState,
    playerId: string
  ): Partial<ILoveLetterState> {
    // Hide other players' hands and deck contents
    const filteredPlayers = state.players.map((p) => {
      if (p.id === playerId) {
        return p
      }
      return {
        ...p,
        hand: [], // Hide hand
      }
    })

    return {
      ...state,
      players: filteredPlayers,
      deck: [], // Hide deck
      setAsideCard: null, // Hide set-aside card
    }
  }

  // Private helper methods

  private createDeck(): CardType[] {
    const deck: CardType[] = []
    for (const card of Object.values(Cards)) {
      for (let i = 0; i < card.count; i++) {
        deck.push(card.type)
      }
    }
    return deck
  }

  private shuffleDeck(deck: CardType[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
  }

  private getTokensToWin(playerCount: number): number {
    switch (playerCount) {
      case 2:
        return 7
      case 3:
        return 5
      case 4:
        return 4
      default:
        return 4
    }
  }

  private handleDrawCard(
    state: ILoveLetterState,
    playerId: string,
    events: IGameEvent[]
  ): ILoveLetterState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId)
    const player = state.players[playerIndex]
    const deck = [...state.deck]
    const drawnCard = deck.pop()!

    const newPlayers = [...state.players]
    newPlayers[playerIndex] = {
      ...player,
      hand: [...player.hand, drawnCard],
      isProtected: false, // Protection expires at start of turn
    }

    events.push({
      type: 'card_drawn',
      payload: { playerId },
      visibility: { type: 'private', playerIds: [playerId] },
      timestamp: new Date(),
    })

    return {
      ...state,
      phase: 'play',
      players: newPlayers,
      deck,
    }
  }

  private handlePlayCard(
    state: ILoveLetterState,
    playerId: string,
    payload: PlayCardPayload,
    events: IGameEvent[]
  ): ILoveLetterState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId)
    const player = state.players[playerIndex]
    const newPlayers = [...state.players]

    // Remove card from hand
    const handIndex = player.hand.indexOf(payload.cardType)
    const newHand = [...player.hand]
    newHand.splice(handIndex, 1)

    newPlayers[playerIndex] = {
      ...player,
      hand: newHand,
      discardPile: [...player.discardPile, payload.cardType],
    }

    events.push({
      type: 'card_played',
      payload: { playerId, cardType: payload.cardType },
      visibility: { type: 'public' },
      timestamp: new Date(),
    })

    let newState: ILoveLetterState = {
      ...state,
      players: newPlayers,
    }

    // Resolve card effect
    newState = this.resolveCardEffect(newState, playerId, payload, events)

    // Advance to next player
    newState = this.advanceToNextPlayer(newState)

    return newState
  }

  private resolveCardEffect(
    state: ILoveLetterState,
    playerId: string,
    payload: PlayCardPayload,
    events: IGameEvent[]
  ): ILoveLetterState {
    const { cardType, targetPlayerId, guessedCard } = payload
    let newState = { ...state }

    // Find valid target (not protected, not eliminated, not self for most cards)
    const validTargets = state.players.filter(
      (p) => !p.isEliminated && !p.isProtected && p.id !== playerId
    )

    switch (cardType) {
      case CardTypes.GUARD:
        if (targetPlayerId && guessedCard && guessedCard !== CardTypes.GUARD) {
          const target = newState.players.find((p) => p.id === targetPlayerId)
          if (target && !target.isProtected && target.hand[0] === guessedCard) {
            newState = this.eliminatePlayer(newState, targetPlayerId, events)
          }
        }
        break

      case CardTypes.PRIEST:
        // Reveal is handled via events
        if (targetPlayerId) {
          const target = state.players.find((p) => p.id === targetPlayerId)
          if (target && !target.isProtected) {
            events.push({
              type: 'hand_revealed',
              payload: { targetPlayerId, hand: target.hand },
              visibility: { type: 'private', playerIds: [playerId] },
              timestamp: new Date(),
            })
          }
        }
        break

      case CardTypes.BARON:
        if (targetPlayerId) {
          newState = this.resolveBaron(newState, playerId, targetPlayerId, events)
        }
        break

      case CardTypes.HANDMAID:
        const playerIndex = newState.players.findIndex((p) => p.id === playerId)
        const newPlayers = [...newState.players]
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          isProtected: true,
        }
        newState = { ...newState, players: newPlayers }
        break

      case CardTypes.PRINCE:
        const targetId = targetPlayerId || playerId
        newState = this.resolvePrince(newState, targetId, events)
        break

      case CardTypes.KING:
        if (targetPlayerId) {
          newState = this.resolveKing(newState, playerId, targetPlayerId, events)
        }
        break

      case CardTypes.COUNTESS:
        // No effect
        break

      case CardTypes.PRINCESS:
        newState = this.eliminatePlayer(newState, playerId, events)
        break
    }

    return newState
  }

  private resolveBaron(
    state: ILoveLetterState,
    playerId: string,
    targetPlayerId: string,
    events: IGameEvent[]
  ): ILoveLetterState {
    const player = state.players.find((p) => p.id === playerId)!
    const target = state.players.find((p) => p.id === targetPlayerId)!

    if (target.isProtected) return state

    const playerValue = Cards[player.hand[0]].value
    const targetValue = Cards[target.hand[0]].value

    events.push({
      type: 'hands_compared',
      payload: {
        player1Id: playerId,
        player1Value: playerValue,
        player2Id: targetPlayerId,
        player2Value: targetValue,
      },
      visibility: { type: 'private', playerIds: [playerId, targetPlayerId] },
      timestamp: new Date(),
    })

    if (playerValue < targetValue) {
      return this.eliminatePlayer(state, playerId, events)
    } else if (targetValue < playerValue) {
      return this.eliminatePlayer(state, targetPlayerId, events)
    }

    return state // Tie - no one eliminated
  }

  private resolvePrince(
    state: ILoveLetterState,
    targetPlayerId: string,
    events: IGameEvent[]
  ): ILoveLetterState {
    const target = state.players.find((p) => p.id === targetPlayerId)!

    if (target.isProtected) return state

    // If discarding Princess, player is eliminated
    if (target.hand[0] === CardTypes.PRINCESS) {
      return this.eliminatePlayer(state, targetPlayerId, events)
    }

    // Discard and draw new card
    const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId)
    const newPlayers = [...state.players]
    const deck = [...state.deck]

    const discardedCard = target.hand[0]
    let newCard: CardType

    if (deck.length > 0) {
      newCard = deck.pop()!
    } else {
      // Draw the set-aside card
      newCard = state.setAsideCard!
    }

    newPlayers[targetIndex] = {
      ...target,
      hand: [newCard],
      discardPile: [...target.discardPile, discardedCard],
    }

    events.push({
      type: 'card_discarded',
      payload: { playerId: targetPlayerId, discardedCard },
      visibility: { type: 'public' },
      timestamp: new Date(),
    })

    return {
      ...state,
      players: newPlayers,
      deck,
    }
  }

  private resolveKing(
    state: ILoveLetterState,
    playerId: string,
    targetPlayerId: string,
    events: IGameEvent[]
  ): ILoveLetterState {
    const target = state.players.find((p) => p.id === targetPlayerId)!

    if (target.isProtected) return state

    const playerIndex = state.players.findIndex((p) => p.id === playerId)
    const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId)

    const player = state.players[playerIndex]
    const newPlayers = [...state.players]

    // Swap hands
    newPlayers[playerIndex] = { ...player, hand: [...target.hand] }
    newPlayers[targetIndex] = { ...target, hand: [...player.hand] }

    events.push({
      type: 'hands_traded',
      payload: { player1Id: playerId, player2Id: targetPlayerId },
      visibility: { type: 'private', playerIds: [playerId, targetPlayerId] },
      timestamp: new Date(),
    })

    return { ...state, players: newPlayers }
  }

  private eliminatePlayer(
    state: ILoveLetterState,
    playerId: string,
    events: IGameEvent[]
  ): ILoveLetterState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId)
    const player = state.players[playerIndex]
    const newPlayers = [...state.players]

    newPlayers[playerIndex] = {
      ...player,
      isEliminated: true,
      discardPile: [...player.discardPile, ...player.hand],
      hand: [],
    }

    events.push({
      type: 'player_eliminated',
      payload: { playerId, discardedHand: player.hand },
      visibility: { type: 'public' },
      timestamp: new Date(),
    })

    return { ...state, players: newPlayers }
  }

  private advanceToNextPlayer(state: ILoveLetterState): ILoveLetterState {
    const activePlayers = state.players.filter((p) => !p.isEliminated)
    const currentIndex = activePlayers.findIndex((p) => p.id === state.currentPlayerId)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    const nextPlayer = activePlayers[nextIndex]

    return {
      ...state,
      phase: 'draw',
      currentPlayerId: nextPlayer.id,
      turn: state.turn + 1,
    }
  }

  private checkRoundEnd(state: ILoveLetterState, events: IGameEvent[]): ILoveLetterState {
    const activePlayers = state.players.filter((p) => !p.isEliminated)

    // Round ends when 1 player left or deck empty
    if (activePlayers.length === 1 || state.deck.length === 0) {
      return this.endRound(state, events)
    }

    return state
  }

  private endRound(state: ILoveLetterState, events: IGameEvent[]): ILoveLetterState {
    const activePlayers = state.players.filter((p) => !p.isEliminated)

    // Determine winner (highest card value)
    let winner = activePlayers[0]
    for (const player of activePlayers) {
      if (Cards[player.hand[0]].value > Cards[winner.hand[0]].value) {
        winner = player
      }
    }

    // Award token
    const winnerIndex = state.players.findIndex((p) => p.id === winner.id)
    const newPlayers = [...state.players]
    newPlayers[winnerIndex] = {
      ...winner,
      tokensOfAffection: winner.tokensOfAffection + 1,
    }

    events.push({
      type: 'round_won',
      payload: { winnerId: winner.id, winningCard: winner.hand[0] },
      visibility: { type: 'public' },
      timestamp: new Date(),
    })

    // Check for game win
    if (newPlayers[winnerIndex].tokensOfAffection >= state.tokensToWin) {
      events.push({
        type: 'game_won',
        payload: { winnerId: winner.id },
        visibility: { type: 'public' },
        timestamp: new Date(),
      })

      return {
        ...state,
        phase: 'game_over',
        players: newPlayers,
        isFinished: true,
        winnerId: winner.id,
      }
    }

    // Start new round
    const newRoundState = this.initialize(
      state.players.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: true,
      }))
    )

    if (newRoundState.isSuccess) {
      return {
        ...newRoundState.value,
        players: newRoundState.value.players.map((p: ILoveLetterPlayer, i: number) => ({
          ...p,
          tokensOfAffection: newPlayers[i].tokensOfAffection,
        })),
        round: state.round + 1,
      }
    }

    return state
  }
}

/**
 * Create a new Love Letter game engine
 */
export function createLoveLetterEngine(): LoveLetterEngine {
  return new LoveLetterEngine()
}
