interface TurnBasedCardTargetablePlayer {
  id: string
  isProtected: boolean
  isEliminated: boolean
  isMe: boolean
}

const TARGET_REQUIRED_CARDS = new Set(['guard', 'priest', 'baron', 'king'])

export interface TurnBasedCardHandActionState {
  legalTargetIds: string[]
  requiresTarget: boolean
  requiresGuess: boolean
  canAttemptPlay: boolean
  helperText: string | null
}

export function resolveTurnBasedCardHandActionState(args: {
  canPlay: boolean
  selectedCard: string | null
  selectedTarget: string | null
  selectedGuess: string | null
  players: readonly TurnBasedCardTargetablePlayer[]
}): TurnBasedCardHandActionState {
  const { canPlay, selectedCard, selectedTarget, selectedGuess, players } = args

  if (!canPlay || !selectedCard) {
    return {
      legalTargetIds: [],
      requiresTarget: false,
      requiresGuess: false,
      canAttemptPlay: false,
      helperText: selectedCard ? null : 'Select a card from your hand.',
    }
  }

  const legalTargetIds = players
    .filter((player) => isLegalTargetForCard(selectedCard, player))
    .map((player) => player.id)

  const requiresTarget = TARGET_REQUIRED_CARDS.has(selectedCard) && legalTargetIds.length > 0
  const requiresGuess = selectedCard === 'guard' && requiresTarget
  const hasSelectedLegalTarget = selectedTarget !== null && legalTargetIds.includes(selectedTarget)
  const hasRequiredGuess = !requiresGuess || Boolean(selectedGuess)
  const canAttemptPlay = (!requiresTarget || hasSelectedLegalTarget) && hasRequiredGuess

  if (requiresTarget && !hasSelectedLegalTarget) {
    return {
      legalTargetIds,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'Select a target player.',
    }
  }

  if (requiresGuess && !selectedGuess) {
    return {
      legalTargetIds,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'Select the card to guess.',
    }
  }

  if (selectedCard === 'guard' && legalTargetIds.length === 0) {
    return {
      legalTargetIds,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'No legal targets: Guard can be discarded without a guess.',
    }
  }

  return {
    legalTargetIds,
    requiresTarget,
    requiresGuess,
    canAttemptPlay,
    helperText: null,
  }
}

function isLegalTargetForCard(
  selectedCard: string,
  player: TurnBasedCardTargetablePlayer
): boolean {
  if (player.isEliminated) {
    return false
  }

  if (selectedCard === 'prince' && player.isMe) {
    return true
  }

  if (player.isMe) {
    return false
  }

  return !player.isProtected
}
