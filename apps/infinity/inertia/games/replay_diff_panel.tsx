import { Badge } from '@infinity.dev/ui/primitives/badge'
import type { ReplayDiff } from './game_replay_helpers.js'

interface ReplayDiffPanelProps {
  replayDiff: ReplayDiff | null
  getPlayerLabel: (playerId?: string | null) => string
}

export function ReplayDiffPanel({ replayDiff, getPlayerLabel }: ReplayDiffPanelProps) {
  if (!replayDiff) {
    return null
  }

  return (
    <div className="rounded-base border-2 border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Step Diff</p>
      {!replayDiff.hasPreviousStep ? (
        <p className="mt-2 text-xs text-amber-900">
          Initial snapshot: no previous step to compare.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant={replayDiff.phaseChanged ? 'default' : 'secondary'}>
              Phase: {replayDiff.previousPhase} {'>'} {replayDiff.currentPhase}
            </Badge>
            <Badge variant={replayDiff.currentPlayerChanged ? 'default' : 'secondary'}>
              Active:{' '}
              {replayDiff.currentPlayerChanged
                ? `${getPlayerLabel(replayDiff.previousCurrentPlayerId)} -> ${getPlayerLabel(replayDiff.currentCurrentPlayerId)}`
                : getPlayerLabel(replayDiff.currentCurrentPlayerId)}
            </Badge>
            <Badge variant={replayDiff.finishedChanged ? 'default' : 'secondary'}>
              Status: {replayDiff.previousFinished ? 'Finished' : 'Running'} {'>'}{' '}
              {replayDiff.currentFinished ? 'Finished' : 'Running'}
            </Badge>
          </div>

          {replayDiff.scoreChanges.length > 0 ? (
            <div className="space-y-1">
              {replayDiff.scoreChanges.map((change) => (
                <p key={`diff-score-${change.playerId}`} className="text-xs text-amber-900">
                  {getPlayerLabel(change.playerId)}: {change.previousScore} {'>'}{' '}
                  {change.currentScore} ({change.delta > 0 ? `+${change.delta}` : change.delta})
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-900">No score change on this step.</p>
          )}
        </div>
      )}
    </div>
  )
}
