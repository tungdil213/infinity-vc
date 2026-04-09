import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import { Badge } from '@infinity.dev/ui/primitives/badge'
import { Alert, AlertDescription } from '@infinity.dev/ui/primitives/alert'
import type {
  GamePlayerSummary,
  GameRendererProps,
  TurnBasedCardHandRendererOptions,
} from '../game_renderer_types.js'
import { resolveTurnBasedCardHandActionState } from '../turn_based_card_hand_action_state.js'

const CARD_INFO: Record<
  string,
  { name: string; value: number; description: string; color: string }
> = {
  guard: {
    name: 'Guard',
    value: 1,
    description: 'Guess a card. If correct, target eliminated.',
    color: 'bg-red-500',
  },
  priest: {
    name: 'Priest',
    value: 2,
    description: "Look at another player's hand.",
    color: 'bg-blue-500',
  },
  baron: {
    name: 'Baron',
    value: 3,
    description: 'Compare hands. Lower value eliminated.',
    color: 'bg-green-500',
  },
  handmaid: {
    name: 'Handmaid',
    value: 4,
    description: 'Protected until your next turn.',
    color: 'bg-yellow-500',
  },
  prince: {
    name: 'Prince',
    value: 5,
    description: 'Target discards and draws new card.',
    color: 'bg-purple-500',
  },
  king: {
    name: 'King',
    value: 6,
    description: 'Trade hands with another player.',
    color: 'bg-orange-500',
  },
  countess: {
    name: 'Countess',
    value: 7,
    description: 'Must discard if you have King/Prince.',
    color: 'bg-pink-500',
  },
  princess: {
    name: 'Princess',
    value: 8,
    description: 'If discarded, you are eliminated.',
    color: 'bg-indigo-500',
  },
}

const GUESSABLE_CARDS = ['priest', 'baron', 'handmaid', 'prince', 'king', 'countess', 'princess']

interface TurnBasedCardHandPlayer {
  id: string
  name: string
  isActive: boolean
  isProtected: boolean
  isEliminated: boolean
  handCount: number
  discardPile: Array<{ type: string; name: string; value: number }>
  tokensOfAffection: number
  isCurrentPlayer: boolean
  isMe: boolean
}

function normalizePlayers(players: GamePlayerSummary[] | undefined): TurnBasedCardHandPlayer[] {
  return (players ?? []).map((player) => ({
    id: player.id,
    name: player.name,
    isActive: Boolean(player.isActive),
    isProtected: Boolean(player.isProtected),
    isEliminated: Boolean(player.isEliminated),
    handCount: Number(player.handCount ?? 0),
    discardPile: Array.isArray(player.discardPile) ? player.discardPile : [],
    tokensOfAffection: Number(player.tokensOfAffection ?? 0),
    isCurrentPlayer: Boolean(player.isCurrentPlayer),
    isMe: Boolean(player.isMe),
  }))
}

function Card({
  cardType,
  onClick,
  selected,
  disabled,
  size = 'normal',
}: {
  cardType: string
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
  size?: 'small' | 'normal'
}) {
  const card = CARD_INFO[cardType]
  if (!card) {
    return null
  }

  const sizeClasses = { small: 'w-12 h-16 text-xs', normal: 'w-20 h-28 text-sm' }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${sizeClasses[size]} ${card.color} rounded-lg shadow-lg flex flex-col items-center justify-between p-2 text-white font-bold
        ${onClick && !disabled ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${selected ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${disabled ? 'opacity-50' : ''}`}
    >
      <span className="text-lg">{card.value}</span>
      <span className="text-center leading-tight">{card.name}</span>
    </div>
  )
}

function PlayerCard({
  player,
  isTarget,
  onSelect,
  canTarget,
}: {
  player: TurnBasedCardHandPlayer
  isTarget: boolean
  onSelect: () => void
  canTarget: boolean
}) {
  return (
    <div
      onClick={canTarget ? onSelect : undefined}
      className={`p-4 rounded-lg border-2 transition-all
        ${player.isMe ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        ${player.isCurrentPlayer ? 'ring-2 ring-green-400' : ''}
        ${player.isEliminated ? 'opacity-50 bg-gray-100' : ''}
        ${player.isProtected ? 'border-yellow-400' : ''}
        ${isTarget ? 'ring-4 ring-red-400 scale-105' : ''}
        ${canTarget ? 'cursor-pointer hover:shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${player.isEliminated ? 'bg-gray-400' : 'bg-linear-to-br from-purple-500 to-pink-500'}`}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <div className="flex gap-1 text-xs">
              {player.isMe && <span className="px-1 bg-blue-100 text-blue-700 rounded">You</span>}
              {player.isCurrentPlayer && (
                <span className="px-1 bg-green-100 text-green-700 rounded">Turn</span>
              )}
              {player.isProtected && (
                <span className="px-1 bg-yellow-100 text-yellow-700 rounded">Protected</span>
              )}
              {player.isEliminated && (
                <span className="px-1 bg-red-100 text-red-700 rounded">Out</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg">Tokens: {player.tokensOfAffection}</div>
          <div className="text-xs text-gray-500">{player.handCount} cards</div>
        </div>
      </div>
      {player.discardPile.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Discarded:</div>
          <div className="flex gap-1 flex-wrap">
            {player.discardPile.map((card, index) => (
              <Card key={index} cardType={card.type} size="small" />
            ))}
          </div>
        </div>
      )}
      {(canTarget || isTarget) && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs font-medium">
          {isTarget ? 'Selected target' : 'Click to target'}
        </div>
      )}
    </div>
  )
}

export function TurnBasedCardHandRenderer(props: GameRendererProps) {
  const {
    gameTitle,
    gameState,
    isSpectator,
    isConnected,
    isLoading,
    notifications,
    replayTimeline,
    replayCursor,
    isReplayPinnedToLatest,
    activeReplayStep,
    canViewDebugPayload,
    myHand,
    selectedCard,
    selectedTarget,
    selectedGuess,
    isMyTurn,
    phase,
    canDraw,
    canPlay,
    onLeave,
    onDraw,
    onPlayCard,
    onSelectCard,
    onSelectTarget,
    onSelectGuess,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  } = props

  const rendererOptions = props.rendererOptions as TurnBasedCardHandRendererOptions | null | undefined
  const labels = {
    players: rendererOptions?.sections?.players ?? 'Players',
    hand: rendererOptions?.sections?.hand ?? 'Your Hand',
    actions: rendererOptions?.sections?.actions ?? 'Actions',
    replay: rendererOptions?.sections?.replay ?? 'Replay Timeline',
    spectator: rendererOptions?.sections?.spectator ?? 'Spectator View',
    guess: rendererOptions?.sections?.guess ?? 'Guess a Card',
    roundResult: rendererOptions?.summary?.roundResult ?? 'Round Result',
  }

  const players = normalizePlayers(gameState?.state?.players)
  const actionState = resolveTurnBasedCardHandActionState({
    canPlay,
    myHand,
    selectedCard,
    selectedTarget,
    selectedGuess,
    players,
  })
  const finalState = gameState?.state
  const selectedCardInfo = selectedCard ? CARD_INFO[selectedCard] : null
  const selectedTargetPlayer = selectedTarget
    ? players.find((player) => player.id === selectedTarget) ?? null
    : null
  const effectiveTargetPlayer = actionState.effectiveTargetId
    ? players.find((player) => player.id === actionState.effectiveTargetId) ?? null
    : null
  const selectedGuessInfo = selectedGuess ? CARD_INFO[selectedGuess] : null
  const showGuessSelection =
    selectedCard === 'guard' && (!actionState.requiresTarget || selectedTargetPlayer !== null)
  const actionSummarySegments = selectedCardInfo
    ? [
        selectedCardInfo.name,
        ...(actionState.targetMode === 'required'
          ? [selectedTargetPlayer?.name ?? 'Select target']
          : actionState.targetMode === 'optional'
            ? [effectiveTargetPlayer?.isMe ? 'You (default)' : (effectiveTargetPlayer?.name ?? 'You (default)')]
          : []),
        ...(actionState.requiresGuess
          ? [selectedGuessInfo?.name ?? 'Select guess']
          : []),
      ]
    : []
  const actionSummary = actionSummarySegments.join(' -> ')
  const winnerIds = Array.isArray(finalState?.winnerIds) ? finalState.winnerIds : []
  const loserId = typeof finalState?.loserId === 'string' ? finalState.loserId : null
  const loser = players.find((player) => player.id === loserId)
  const winners = players.filter((player) => winnerIds.includes(player.id))

  if (props.isFinished || finalState?.isFinished) {
    return (
      <div className="flex flex-1 items-center justify-center bg-main p-4">
        <UICard className="max-w-2xl w-full text-center">
          <CardHeader>
            <div className="text-6xl mb-4">🎮</div>
            <CardTitle className="text-3xl">Game Over</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl mb-6">
              {loser?.isMe ? 'You lost this round.' : `${loser?.name ?? 'One player'} lost this round.`}
            </p>

            <div className="space-y-4 text-left">
              <div className="rounded-base border-2 border-border p-3">
                <p className="font-heading mb-2">{labels.roundResult}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Loser</span>
                    <span>{loser?.isMe ? 'You' : (loser?.name ?? 'Unknown')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Winners</span>
                    <span>{winners.map((player) => (player.isMe ? 'You' : player.name)).join(', ') || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>

            {replayTimeline.length > 0 && activeReplayStep && (
              <div className="space-y-3 text-left">
                <div className="rounded-base border-2 border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-heading">{labels.replay}</p>
                    <Badge variant="secondary">
                      Step {replayCursor + 1} / {replayTimeline.length}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => moveReplayCursor(replayCursor - 1)}
                      disabled={replayCursor <= 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => moveReplayCursor(replayCursor + 1)}
                      disabled={replayCursor >= replayTimeline.length - 1}
                    >
                      Next
                    </Button>
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => moveReplayCursor(replayTimeline.length - 1)}
                      disabled={isReplayPinnedToLatest}
                    >
                      Live
                    </Button>
                  </div>
                </div>

                <div className="rounded-base border-2 border-border p-3 text-sm">
                  <p className="font-semibold">
                    {activeReplayStep.kind === 'initial'
                      ? 'Game started'
                      : `${getPlayerLabel(activeReplayStep.actorId)} played ${activeReplayStep.actionType ?? 'action'}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(activeReplayStep.recordedAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Phase: {activeReplayStep.snapshot.phase} | Round:{' '}
                    {activeReplayStep.snapshot.round} | Turn: {activeReplayStep.snapshot.turn}
                  </p>
                </div>

                {renderReplayDiff()}
              </div>
            )}

            <Button onClick={onLeave} className="w-full">
              Back to Lobbies
            </Button>
          </CardContent>
        </UICard>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-main p-4">
      <div className="max-w-6xl mx-auto mb-4">
        <UICard>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-heading">{gameTitle}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary">Round {finalState?.round || 1}</Badge>
                <Badge variant="secondary">Deck: {finalState?.deckCount || 0}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isSpectator && <Badge variant="secondary">Spectator</Badge>}
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button variant="neutral" onClick={onLeave}>
                Leave
              </Button>
            </div>
          </CardContent>
        </UICard>
      </div>

      {notifications.length > 0 && (
        <div className="max-w-6xl mx-auto mb-4 space-y-2">
          {notifications.map((notification, index) => (
            <Alert key={index}>
              <AlertDescription>{notification}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <UICard>
            <CardHeader>
              <CardTitle>{labels.players}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isTarget={selectedTarget === player.id}
                    onSelect={() => onSelectTarget(player.id)}
                    canTarget={actionState.legalTargetIds.includes(player.id)}
                  />
                ))}
              </div>
            </CardContent>
          </UICard>
          {!isSpectator && isMyTurn && (
            <Alert className="bg-main border-2 border-border">
              <AlertDescription className="text-center text-main-foreground">
                <span className="text-xl font-heading">🎮 Your turn!</span>
                <span className="ml-2">
                  {phase === 'draw' ? 'Draw a card' : phase === 'play' ? 'Play a card' : ''}
                </span>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          {isSpectator ? (
            <UICard>
              <CardHeader>
                <CardTitle>{labels.spectator}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You are watching this game live. Player hands and actions are hidden.
                </p>
              </CardContent>
            </UICard>
          ) : (
            <UICard>
              <CardHeader>
                <CardTitle>{labels.hand}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center flex-wrap">
                  {myHand.length > 0 ? (
                    myHand.map((cardType, index) => (
                      <Card
                        key={index}
                        cardType={cardType}
                        selected={selectedCard === cardType}
                        onClick={() => onSelectCard(selectedCard === cardType ? null : cardType)}
                        disabled={
                          !canPlay ||
                          (!actionState.playableCardTypes.includes(cardType) &&
                            selectedCard !== cardType)
                        }
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground py-8">No cards</p>
                  )}
                </div>
                {selectedCard && (
                  <div className="mt-4 p-3 bg-secondary-background rounded-base border-2 border-border">
                    <p className="font-heading">{CARD_INFO[selectedCard]?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CARD_INFO[selectedCard]?.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </UICard>
          )}

          {!isSpectator && selectedCard && (
            <UICard>
              <CardHeader>
                <CardTitle>Action Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-base border-2 border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 1</p>
                  <p className="font-heading">{selectedCardInfo?.name ?? 'Select a card'}</p>
                  {actionState.forcedCardType === 'countess' && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Countess is mandatory because you also hold King or Prince.
                    </p>
                  )}
                </div>

                <div className="rounded-base border-2 border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 2</p>
                  {actionState.targetMode === 'required' ? (
                    selectedTargetPlayer ? (
                      <p className="font-heading">Target: {selectedTargetPlayer.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Choose a player from the board.</p>
                    )
                  ) : actionState.targetMode === 'optional' ? (
                    selectedTargetPlayer ? (
                      <p className="font-heading">Target: {selectedTargetPlayer.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Optional target. If you play now, this card will target you.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">No target required.</p>
                  )}
                </div>

                <div className="rounded-base border-2 border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 3</p>
                  {actionState.requiresGuess ? (
                    selectedGuessInfo ? (
                      <p className="font-heading">Guess: {selectedGuessInfo.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Choose the card to guess.</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">No guess required.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="neutral" size="sm" onClick={() => onSelectCard(null)}>
                    Clear selection
                  </Button>
                  {selectedTarget && (
                    <Button variant="neutral" size="sm" onClick={() => onSelectTarget(null)}>
                      Clear target
                    </Button>
                  )}
                  {actionState.requiresGuess && selectedGuess && (
                    <Button variant="neutral" size="sm" onClick={() => onSelectGuess(null)}>
                      Clear guess
                    </Button>
                  )}
                </div>
              </CardContent>
            </UICard>
          )}

          {!isSpectator && selectedCard === 'guard' && actionState.requiresGuess && (
            <UICard>
              <CardHeader>
                <CardTitle>{labels.guess}</CardTitle>
              </CardHeader>
              <CardContent>
                {showGuessSelection ? (
                  <div className="grid grid-cols-2 gap-2">
                    {GUESSABLE_CARDS.map((cardType) => (
                      <button
                        type="button"
                        key={cardType}
                        onClick={() => onSelectGuess(cardType)}
                        className={`p-2 rounded-base border-2 text-left transition-all ${selectedGuess === cardType ? 'border-main bg-main/10' : 'border-border hover:border-main'}`}
                      >
                        <span className="font-heading">{CARD_INFO[cardType]?.name}</span> (
                        {CARD_INFO[cardType]?.value})
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Choose a target first to unlock the Guard guess.
                  </p>
                )}
              </CardContent>
            </UICard>
          )}

          <UICard>
            <CardHeader>
              <CardTitle>{labels.actions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isSpectator ? (
                <p className="text-center text-muted-foreground py-4">
                  Spectator mode: actions are disabled.
                </p>
              ) : (
                <>
                  {selectedCard && actionState.helperText && (
                    <p className="text-sm text-muted-foreground">{actionState.helperText}</p>
                  )}
                  {selectedCard && (
                    <div className="rounded-base border-2 border-dashed border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Action Summary
                        </p>
                        <Badge variant={actionState.canAttemptPlay ? 'default' : 'secondary'}>
                          {actionState.canAttemptPlay ? 'Ready' : 'Incomplete'}
                        </Badge>
                      </div>
                      <p className="mt-2 font-heading text-sm">{actionSummary}</p>
                    </div>
                  )}
                  {canDraw && (
                    <Button onClick={onDraw} disabled={isLoading} className="w-full">
                      {isLoading ? 'Drawing...' : '🃏 Draw Card'}
                    </Button>
                  )}
                  {canPlay && selectedCard && (
                    <Button
                      onClick={onPlayCard}
                      disabled={isLoading || !actionState.canAttemptPlay}
                      className="w-full"
                    >
                      {isLoading ? 'Playing...' : `▶️ Play ${CARD_INFO[selectedCard]?.name}`}
                    </Button>
                  )}
                  {!isMyTurn && (
                    <p className="text-center text-muted-foreground py-4">Waiting for other players...</p>
                  )}
                </>
              )}
            </CardContent>
          </UICard>

          <UICard>
            <CardHeader>
              <CardTitle>{labels.replay}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {replayTimeline.length === 0 || !activeReplayStep ? (
                <p className="text-sm text-muted-foreground">No replay data available yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="secondary">
                      Step {replayCursor + 1} / {replayTimeline.length}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayCursor - 1)}
                        disabled={replayCursor <= 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayCursor + 1)}
                        disabled={replayCursor >= replayTimeline.length - 1}
                      >
                        Next
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => moveReplayCursor(replayTimeline.length - 1)}
                        disabled={isReplayPinnedToLatest}
                      >
                        Live
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-base border-2 border-border p-3 text-sm">
                    <p className="font-semibold">
                      {activeReplayStep.kind === 'initial'
                        ? 'Game started'
                        : `${getPlayerLabel(activeReplayStep.actorId)} played ${activeReplayStep.actionType ?? 'action'}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activeReplayStep.recordedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Phase: {activeReplayStep.snapshot.phase} | Round:{' '}
                      {activeReplayStep.snapshot.round} | Turn: {activeReplayStep.snapshot.turn}
                    </p>
                  </div>

                  {renderReplayDiff()}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Engine Events
                    </p>
                    {activeReplayStep.events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events for this step.</p>
                    ) : (
                      activeReplayStep.events.map((event, index) => (
                        <div
                          key={`replay-ll-event-${activeReplayStep.step}-${event.type}-${index}`}
                          className="rounded-base border-2 border-border px-3 py-2 text-xs"
                        >
                          <p className="font-semibold">{describeReplayEvent(event)}</p>
                          {canViewDebugPayload ? (
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                              {formatDebugPayload(event.payload)}
                            </pre>
                          ) : (
                            <p className="mt-1 text-muted-foreground">
                              Debug payload hidden for non-admin users.
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </UICard>
        </div>
      </div>
    </div>
  )
}
