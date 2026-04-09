import { Head } from '@inertiajs/react'
import type { RendererKind } from '@infinity.dev/game-engine'
import { Button } from '@infinity.dev/ui/primitives/button'
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
} from '@infinity.dev/ui/primitives/card'
import Layout from '../layouts/layout'
import {
  formatGameTitle,
  resolveGameRenderer,
  resolveRendererOptions,
} from '../games/game_renderer_registry.js'
import type { GameRendererOptions, PlayerViewState, ReplayStep } from '../games/game_renderer_types.js'
import { useGamePageController } from '../hooks/use_game_page_controller.js'

interface GameProps {
  gameId: string
  gameType: string
  gameTitle?: string | null
  rendererKind?: RendererKind | null
  rendererOptions?: GameRendererOptions | null
  pollingIntervalMs?: number | null
  showReplayDiff?: boolean | null
  playerView: PlayerViewState | null
  availableActions: string[]
  replayTimeline?: ReplayStep[]
  user: { uuid: string; nickName: string; role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' }
  isFinished: boolean
  isSpectator?: boolean
  game?: unknown
}

export default function Game({
  gameId,
  gameType,
  gameTitle: initialGameTitle,
  rendererKind,
  rendererOptions,
  pollingIntervalMs: initialPollingIntervalMs,
  showReplayDiff = null,
  playerView,
  availableActions: initialActions,
  replayTimeline: initialReplayTimeline = [],
  user,
  isFinished,
  isSpectator = false,
}: GameProps) {
  const resolvedRenderer = resolveGameRenderer({ rendererKind, gameType })
  const resolvedRendererOptions = resolveRendererOptions({
    rendererKind,
    gameType,
    rendererOptions,
  })
  const pollingIntervalMs = initialPollingIntervalMs ?? resolvedRenderer?.pollingIntervalMs ?? 5000
  const gameTitle = initialGameTitle ?? formatGameTitle(gameType)
  const {
    gameState,
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
    lastSubmittedMove,
    isMyTurn,
    phase,
    canDraw,
    canPlay,
    canSubmitMove,
    isGameFinished,
    onLeave,
    onDraw,
    onSubmitMove,
    onPlayCard,
    onSelectCard,
    onSelectTarget,
    onSelectGuess,
    moveReplayCursor,
    getPlayerLabel,
    describeReplayEvent,
    formatDebugPayload,
    renderReplayDiff,
  } = useGamePageController({
    gameId,
    user,
    playerView,
    initialActions,
    initialReplayTimeline,
    isFinished,
    isSpectator,
    pollingIntervalMs,
    showReplayDiff,
  })

  if (!resolvedRenderer) {
    return (
      <Layout>
        <Head title={`${gameTitle} - Unsupported Renderer`} />
        <div className="flex flex-1 items-center justify-center bg-main p-4">
          <UICard className="max-w-xl w-full">
            <CardHeader>
              <CardTitle>Renderer unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No frontend renderer is registered for `{gameType}` yet.
              </p>
              <Button onClick={onLeave} className="w-full">
                Back to Lobbies
              </Button>
            </CardContent>
          </UICard>
        </div>
      </Layout>
    )
  }

  const RendererComponent = resolvedRenderer.Component
  const pageTitle = isGameFinished
    ? `Game Over - ${gameTitle}`
    : `${gameTitle} - Round ${gameState?.state?.round || 1}`

  return (
    <Layout>
      <Head title={pageTitle} />
      <RendererComponent
        gameTitle={gameTitle}
        rendererOptions={resolvedRendererOptions ?? null}
        gameState={gameState}
        user={user}
        isFinished={isGameFinished}
        isSpectator={isSpectator}
        isConnected={isConnected}
        isLoading={isLoading}
        notifications={notifications}
        replayTimeline={replayTimeline}
        replayCursor={replayCursor}
        isReplayPinnedToLatest={isReplayPinnedToLatest}
        activeReplayStep={activeReplayStep}
        canViewDebugPayload={canViewDebugPayload}
        myHand={myHand}
        selectedCard={selectedCard}
        selectedTarget={selectedTarget}
        selectedGuess={selectedGuess}
        lastSubmittedMove={lastSubmittedMove}
        isMyTurn={isMyTurn}
        phase={phase}
        canDraw={canDraw}
        canPlay={canPlay}
        canSubmitMove={canSubmitMove}
        onLeave={onLeave}
        onDraw={onDraw}
        onSubmitMove={onSubmitMove}
        onPlayCard={onPlayCard}
        onSelectCard={onSelectCard}
        onSelectTarget={onSelectTarget}
        onSelectGuess={onSelectGuess}
        moveReplayCursor={moveReplayCursor}
        getPlayerLabel={getPlayerLabel}
        describeReplayEvent={describeReplayEvent}
        formatDebugPayload={formatDebugPayload}
        renderReplayDiff={renderReplayDiff}
      />
    </Layout>
  )
}
