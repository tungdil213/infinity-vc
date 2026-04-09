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
  GameRendererProps,
  GameRoundSummary,
  GamePlayerSummary,
  RpsMove,
  SimultaneousChoiceRendererOptions,
} from '../game_renderer_types.js'

const RPS_MOVE_META: Record<RpsMove, { label: string; picto: string }> = {
  rock: { label: 'Rock', picto: '✊' },
  paper: { label: 'Paper', picto: '✋' },
  scissors: { label: 'Scissors', picto: '✌' },
}

function formatRpsMove(move: string | undefined) {
  if (!move || !Object.keys(RPS_MOVE_META).includes(move)) {
    return 'Hidden'
  }

  const typedMove = move as RpsMove
  return `${RPS_MOVE_META[typedMove].picto} ${RPS_MOVE_META[typedMove].label}`
}

function normalizePlayers(
  players: GamePlayerSummary[] | undefined,
  currentUserUuid: string,
  scores: Record<string, number>,
  roundChoices: Record<string, string>
) {
  return (players ?? []).map((player) => ({
    ...player,
    score: scores[player.id] ?? 0,
    choice: roundChoices[player.id],
    isMe: player.id === currentUserUuid,
  }))
}

export function SimultaneousChoiceRenderer(props: GameRendererProps) {
  const {
    gameTitle,
    gameState,
    user,
    isSpectator,
    isConnected,
    isLoading,
    notifications,
    replayTimeline,
    replayCursor,
    isReplayPinnedToLatest,
    activeReplayStep,
    canViewDebugPayload,
    lastSubmittedMove,
    isMyTurn,
    phase,
    canSubmitMove,
    onLeave,
    onSubmitMove,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  } = props

  const rendererOptions = props.rendererOptions as SimultaneousChoiceRendererOptions | null | undefined
  const labels = {
    players: rendererOptions?.sections?.players ?? 'Players & Scores',
    actions: rendererOptions?.sections?.actions ?? 'Actions',
    history: rendererOptions?.sections?.history ?? 'Rounds History',
    replay: rendererOptions?.sections?.replay ?? 'Replay Timeline',
    finalScore: rendererOptions?.summary?.finalScore ?? 'Final Score',
    roundsRecap: rendererOptions?.summary?.roundsRecap ?? 'Rounds Recap',
  }

  const finalState = gameState?.state
  const scores = finalState?.scores ?? {}
  const roundChoices = finalState?.roundChoices ?? {}
  const rounds = finalState?.rounds ?? []
  const roundsToWin = Number(finalState?.roundsToWin ?? 3)
  const players = normalizePlayers(finalState?.players, user.uuid, scores, roundChoices)
  const latestRound = rounds.at(-1)
  const latestRoundLabel = latestRound
    ? latestRound.winnerId === null
      ? 'Draw'
      : latestRound.winnerId === user.uuid
        ? 'You won the round'
        : 'You lost the round'
    : null
  const winner = finalState?.players?.find((player) =>
    finalState?.winnerId ? player.id === finalState.winnerId : !player.isEliminated
  )

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
              {winner?.isMe ? 'You won!' : `${winner?.name ?? 'Unknown player'} wins!`}
            </p>

            <div className="space-y-4 text-left">
              <div className="rounded-base border-2 border-border p-3">
                <p className="font-heading mb-2">{labels.finalScore}</p>
                <div className="space-y-1 text-sm">
                  {(finalState?.players ?? []).map((player) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <span>
                        {player.name} {player.id === user.uuid ? '(You)' : ''}
                      </span>
                      <span>{scores[player.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-base border-2 border-border p-3">
                <p className="font-heading mb-2">{labels.roundsRecap}</p>
                <div className="space-y-1 text-sm">
                  {rounds.length === 0 ? (
                    <p className="text-muted-foreground">No rounds recorded.</p>
                  ) : (
                    rounds.map((round, index) => (
                      <div
                        key={`final-round-${round.round}-${round.winnerId ?? 'draw'}-${index}`}
                        className="flex items-center justify-between"
                      >
                        <span>Round {round.round}</span>
                        <span>
                          {round.winnerId === null
                            ? 'Draw'
                            : round.winnerId === user.uuid
                              ? 'Won by you'
                              : 'Won by opponent'}
                        </span>
                      </div>
                    ))
                  )}
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
      <div className="max-w-4xl mx-auto space-y-4">
        <UICard>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-heading">{gameTitle}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary">Round {finalState?.round || 1}</Badge>
                <Badge variant="secondary">First to {roundsToWin}</Badge>
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

        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <Alert key={index}>
                <AlertDescription>{notification}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {latestRoundLabel && latestRound && (
          <Alert>
            <AlertDescription>
              Round {latestRound.round}: {latestRoundLabel}
            </AlertDescription>
          </Alert>
        )}

        <UICard>
          <CardHeader>
            <CardTitle>{labels.players}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex flex-col gap-2 rounded-base border-2 border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-heading">
                    {player.name} {player.isMe ? '(You)' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {player.choice ? `Choice: ${formatRpsMove(player.choice)}` : 'Choice: hidden'}
                  </p>
                </div>
                <Badge variant="secondary">Score: {player.score}</Badge>
              </div>
            ))}
          </CardContent>
        </UICard>

        <UICard>
          <CardHeader>
            <CardTitle>{labels.actions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSpectator ? (
              <p className="text-center text-muted-foreground py-2">
                Spectator mode: actions are disabled.
              </p>
            ) : canSubmitMove ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(RPS_MOVE_META) as RpsMove[]).map((move) => {
                  const isSelected = lastSubmittedMove === move

                  return (
                    <button
                      key={move}
                      type="button"
                      onClick={() => onSubmitMove(move)}
                      disabled={isLoading}
                      className={`group relative rounded-base border-2 p-3 text-left shadow-shadow transition-all
                        hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
                        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
                        ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                        ${isSelected ? 'translate-x-boxShadowX translate-y-boxShadowY shadow-none ring-2 ring-black' : ''}
                        ${
                          move === 'rock'
                            ? 'bg-linear-to-br from-amber-100 via-orange-100 to-orange-200 border-orange-300'
                            : move === 'paper'
                              ? 'bg-linear-to-br from-sky-100 via-cyan-100 to-cyan-200 border-cyan-300'
                              : 'bg-linear-to-br from-violet-100 via-fuchsia-100 to-fuchsia-200 border-fuchsia-300'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-base uppercase tracking-wide text-gray-700">
                            {RPS_MOVE_META[move].label}
                          </p>
                          <p className="text-xs text-gray-600">
                            {move === 'rock'
                              ? 'Crushes scissors'
                              : move === 'paper'
                                ? 'Covers rock'
                                : 'Cuts paper'}
                          </p>
                        </div>
                        <span className="text-3xl leading-none">{RPS_MOVE_META[move].picto}</span>
                      </div>
                      <div className="mt-3 text-xs font-base text-gray-700">
                        {isSelected ? 'Selected' : isLoading ? 'Submitting...' : 'Choose move'}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-2">
                {lastSubmittedMove
                  ? `Move submitted (${formatRpsMove(lastSubmittedMove)}), waiting for opponent.`
                  : isMyTurn
                    ? 'Move already submitted, waiting for opponent.'
                    : 'Waiting for other player...'}
              </p>
            )}
            <p className="text-xs text-muted-foreground text-center">Phase: {phase}</p>
          </CardContent>
        </UICard>

        <UICard>
          <CardHeader>
            <CardTitle>{labels.history}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rounds completed yet.</p>
            ) : (
              rounds
                .slice()
                .reverse()
                .map((round: GameRoundSummary, index) => (
                  <div
                    key={`history-round-${round.round}-${round.winnerId ?? 'draw'}-${index}`}
                    className="rounded-base border-2 border-border px-3 py-2 text-sm"
                  >
                    <p>
                      <span className="font-semibold mr-2">Round {round.round}</span>
                      <span>
                        {round.winnerId === null
                          ? 'Draw'
                          : round.winnerId === user.uuid
                            ? 'Won by you'
                            : 'Won by opponent'}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(finalState?.players ?? [])
                        .map((player) => {
                          const label = player.id === user.uuid ? 'You' : player.name
                          return `${label}: ${formatRpsMove(round.choices?.[player.id])}`
                        })
                        .join(' • ')}
                    </p>
                  </div>
                ))
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
                    Phase: {activeReplayStep.snapshot.phase} | Round: {activeReplayStep.snapshot.round}{' '}
                    | Turn: {activeReplayStep.snapshot.turn}
                  </p>
                </div>

                {renderReplayDiff()}

                <div className="rounded-base border-2 border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Snapshot
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    {activeReplayStep.snapshot.players.map((player) => (
                      <div
                        key={`replay-player-${player.id}`}
                        className="flex items-center justify-between rounded-base px-2 py-1"
                      >
                        <span>
                          {player.name} {player.id === user.uuid ? '(You)' : ''}
                        </span>
                        <span>{(activeReplayStep.snapshot.scores?.[player.id] ?? 0).toString()}</span>
                      </div>
                    ))}
                  </div>
                  {activeReplayStep.snapshot.roundChoices &&
                    Object.keys(activeReplayStep.snapshot.roundChoices).length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {(activeReplayStep.snapshot.players ?? [])
                          .map((player) => {
                            const move = activeReplayStep.snapshot.roundChoices?.[player.id]
                            const label = player.id === user.uuid ? 'You' : player.name
                            return `${label}: ${formatRpsMove(move)}`
                          })
                          .join(' • ')}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Engine Events
                  </p>
                  {activeReplayStep.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events for this step.</p>
                  ) : (
                    activeReplayStep.events.map((event, index) => (
                      <div
                        key={`replay-event-${activeReplayStep.step}-${event.type}-${index}`}
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
  )
}
