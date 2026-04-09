interface TurnBasedCardTargetablePlayer {
  id: string
  isProtected: boolean
  isEliminated: boolean
  isMe: boolean
}

const TARGET_REQUIRED_CARDS = new Set(['guard', 'priest', 'baron', 'king'])

export interface TurnBasedCardHandActionState {
  playableCardTypes: string[]
  forcedCardType: string | null
  legalTargetIds: string[]
  targetMode: 'none' | 'required' | 'optional'
  effectiveTargetId: string | null
  requiresTarget: boolean
  requiresGuess: boolean
  canAttemptPlay: boolean
  helperText: string | null
}

export function resolveTurnBasedCardHandActionState(args: {
  canPlay: boolean
  myHand: readonly string[]
  selectedCard: string | null
  selectedTarget: string | null
  selectedGuess: string | null
  players: readonly TurnBasedCardTargetablePlayer[]
}): TurnBasedCardHandActionState {
  const { canPlay, myHand, selectedCard, selectedTarget, selectedGuess, players } = args
  const { playableCardTypes, forcedCardType } = resolvePlayableCardTypes(myHand)

  if (!canPlay || !selectedCard) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds: [],
      targetMode: 'none',
      effectiveTargetId: null,
      requiresTarget: false,
      requiresGuess: false,
      canAttemptPlay: false,
      helperText: selectedCard ? null : 'Select a card from your hand.',
    }
  }

  if (!playableCardTypes.includes(selectedCard)) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds: [],
      targetMode: 'none',
      effectiveTargetId: null,
      requiresTarget: false,
      requiresGuess: false,
      canAttemptPlay: false,
      helperText: 'Countess must be played when paired with King or Prince.',
    }
  }

  const legalTargetIds = players
    .filter((player) => isLegalTargetForCard(selectedCard, player))
    .map((player) => player.id)
  const selfTargetId = players.find((player) => player.isMe)?.id ?? null
  const targetMode =
    selectedCard === 'prince' && legalTargetIds.length > 0
      ? 'optional'
      : TARGET_REQUIRED_CARDS.has(selectedCard) && legalTargetIds.length > 0
        ? 'required'
        : 'none'
  const requiresTarget = targetMode === 'required'
  const requiresGuess = selectedCard === 'guard' && requiresTarget
  const hasSelectedLegalTarget = selectedTarget !== null && legalTargetIds.includes(selectedTarget)
  const hasRequiredGuess = !requiresGuess || Boolean(selectedGuess)
  const canAttemptPlay = (!requiresTarget || hasSelectedLegalTarget) && hasRequiredGuess
  const effectiveTargetId = hasSelectedLegalTarget
    ? selectedTarget
    : targetMode === 'optional'
      ? selfTargetId
      : null

  if (requiresTarget && !hasSelectedLegalTarget) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds,
      targetMode,
      effectiveTargetId,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'Select a target player.',
    }
  }

  if (requiresGuess && !selectedGuess) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds,
      targetMode,
      effectiveTargetId,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'Select the card to guess.',
    }
  }

  if (selectedCard === 'guard' && legalTargetIds.length === 0) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds,
      targetMode,
      effectiveTargetId,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText:
        'No legal targets: all opponents are protected or eliminated. Guard can be discarded without a guess.',
    }
  }

  if (targetMode === 'optional' && !hasSelectedLegalTarget) {
    return {
      playableCardTypes,
      forcedCardType,
      legalTargetIds,
      targetMode,
      effectiveTargetId,
      requiresTarget,
      requiresGuess,
      canAttemptPlay,
      helperText: 'Optional target: choose a player, or play now to target yourself.',
    }
  }

  return {
    playableCardTypes,
    forcedCardType,
    legalTargetIds,
    targetMode,
    effectiveTargetId,
    requiresTarget,
    requiresGuess,
    canAttemptPlay,
    helperText: null,
  }
}

function resolvePlayableCardTypes(myHand: readonly string[]): {
  playableCardTypes: string[]
  forcedCardType: string | null
} {
  const uniqueCardTypes = Array.from(new Set(myHand))
  const mustPlayCountess =
    uniqueCardTypes.includes('countess') &&
    (uniqueCardTypes.includes('king') || uniqueCardTypes.includes('prince'))

  if (mustPlayCountess) {
    return {
      playableCardTypes: ['countess'],
      forcedCardType: 'countess',
    }
  }

  return {
    playableCardTypes: uniqueCardTypes,
    forcedCardType: null,
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
