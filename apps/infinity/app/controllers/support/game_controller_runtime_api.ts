import type { GameActionResponse, GameSession } from '#application/services/game_engine_service'
import {
  resolveGameDisplayName as resolveDefaultGameDisplayName,
  resolveGamePresentation as resolveDefaultGamePresentation,
} from '#infrastructure/game_engine/game_presentation_registry'
import {
  toActionResponsePayload,
  toGameActionsPayload,
  toGameApiPayload,
  toPublicPlayersPayload,
} from '#presenters/game_presenter'
import {
  executeParsedGameAction,
  parseGameActionInput,
  type RawGameActionInput,
} from './game_controller_guard.js'
import {
  canViewDebugPayload,
  resolveGameActionsView,
  resolveGameRuntimeAccess,
  resolveGameRuntimeView,
  type GamePresentationResolver,
  type GameRuntimeReader,
  type RuntimeSessionResolver,
  type RuntimeUserContext,
} from './game_controller_runtime.js'

export interface GameActionRuntimeReader extends GameRuntimeReader {
  drawCard(gameUuid: string, userUuid: string): GameActionResponse
  playCard(
    gameUuid: string,
    userUuid: string,
    cardType: string,
    targetPlayerId?: string,
    guessedCard?: string
  ): GameActionResponse
  executeAction(request: {
    gameId: string
    playerId: string
    actionType: string
    payload?: Record<string, unknown>
  }): GameActionResponse
}

export type RuntimeApiPayloadResult<TPayload> =
  | {
      readonly status: 'not_found'
    }
  | {
      readonly status: 'found'
      readonly payload: TPayload
    }

export type GameActionFlowResult =
  | {
      readonly status: 'not_found'
    }
  | {
      readonly status: 'spectator'
    }
  | {
      readonly status: 'invalid_action'
      readonly error?: string
    }
  | {
      readonly status: 'rejected'
      readonly error?: string
    }
  | {
      readonly status: 'executed'
      readonly payload: ReturnType<typeof toActionResponsePayload>
    }

export async function resolveGameApiPayload(options: {
  readonly gameUuid: string
  readonly user: RuntimeUserContext
  readonly resolveRuntimeSession: RuntimeSessionResolver
  readonly runtimeReader: GameRuntimeReader
  readonly presentationResolver?: GamePresentationResolver
}): Promise<RuntimeApiPayloadResult<ReturnType<typeof toGameApiPayload>>> {
  const runtimeView = await resolveGameRuntimeView(options)
  if (!runtimeView) {
    return { status: 'not_found' }
  }

  return {
    status: 'found',
    payload: toGameApiPayload({
      session: runtimeView.session,
      playerView: runtimeView.playerView,
      availableActions: runtimeView.availableActions,
      isSpectator: runtimeView.isSpectator,
      replayTimeline: runtimeView.replayTimeline,
      gameDisplayName: runtimeView.gameDisplayName,
      gamePresentation: runtimeView.gamePresentation,
      runtimeStatus: runtimeView.runtimeStatus,
    }),
  }
}

export async function resolveGameActionsPayload(options: {
  readonly gameUuid: string
  readonly userUuid: string
  readonly resolveRuntimeSession: RuntimeSessionResolver
  readonly getAvailableActions: (gameUuid: string, userUuid: string) => string[]
}): Promise<RuntimeApiPayloadResult<ReturnType<typeof toGameActionsPayload>>> {
  const actionsView = await resolveGameActionsView(options)
  if (!actionsView) {
    return { status: 'not_found' }
  }

  return {
    status: 'found',
    payload: toGameActionsPayload({
      session: actionsView.session,
      availableActions: actionsView.availableActions,
      currentUserUuid: options.userUuid,
      isSpectator: actionsView.isSpectator,
    }),
  }
}

export async function resolvePublicPlayersPayload(options: {
  readonly gameUuid: string
  readonly userUuid: string
  readonly resolveRuntimeSession: RuntimeSessionResolver
}): Promise<RuntimeApiPayloadResult<ReturnType<typeof toPublicPlayersPayload>>> {
  const runtimeAccess = await resolveGameRuntimeAccess(options)
  if (!runtimeAccess) {
    return { status: 'not_found' }
  }

  return {
    status: 'found',
    payload: toPublicPlayersPayload({
      session: runtimeAccess.session,
      currentUserUuid: options.userUuid,
    }),
  }
}

export async function executeGameActionFlow(options: {
  readonly gameUuid: string
  readonly user: RuntimeUserContext
  readonly rawActionInput: RawGameActionInput
  readonly resolveRuntimeSession: RuntimeSessionResolver
  readonly runtimeReader: GameActionRuntimeReader
  readonly persistSessionSnapshot: (session: GameSession) => Promise<void>
  readonly onPersistError?: (error: unknown) => void
  readonly presentationResolver?: GamePresentationResolver
}): Promise<GameActionFlowResult> {
  const runtimeAccess = await resolveGameRuntimeAccess({
    gameUuid: options.gameUuid,
    userUuid: options.user.userUuid,
    resolveRuntimeSession: options.resolveRuntimeSession,
  })
  if (!runtimeAccess) {
    return { status: 'not_found' }
  }

  if (runtimeAccess.isSpectator) {
    return { status: 'spectator' }
  }

  const parsedAction = parseGameActionInput(options.rawActionInput)
  if (!parsedAction.ok) {
    return {
      status: 'invalid_action',
      error: parsedAction.error,
    }
  }

  const result = executeParsedGameAction(
    options.gameUuid,
    options.user.userUuid,
    parsedAction.value,
    options.runtimeReader
  )
  if (!result.success) {
    return {
      status: 'rejected',
      error: result.error,
    }
  }

  await options.persistSessionSnapshot(runtimeAccess.session).catch((error) => {
    options.onPersistError?.(error)
  })

  const presentationResolver = options.presentationResolver ?? defaultPresentationResolver
  const gamePresentation = presentationResolver.resolvePresentation(runtimeAccess.session.gameType)
  const gameDisplayName = presentationResolver.resolveDisplayName(runtimeAccess.session.gameType)
  const playerView = options.runtimeReader.getPlayerView(options.gameUuid, options.user.userUuid)
  const availableActions = options.runtimeReader.getAvailableActions(
    options.gameUuid,
    options.user.userUuid
  )

  return {
    status: 'executed',
    payload: toActionResponsePayload({
      actionResult: result,
      playerView,
      availableActions,
      gameDisplayName,
      includeDebugPayload: canViewDebugPayload(options.user.normalizedRole),
      gamePresentation,
    }),
  }
}

const defaultPresentationResolver: GamePresentationResolver = {
  resolvePresentation: resolveDefaultGamePresentation,
  resolveDisplayName: resolveDefaultGameDisplayName,
}
