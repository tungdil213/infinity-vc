import type { GamePresentationDefinition } from '@infinity.dev/game-engine'
import { type GameSession } from '#application/services/game_engine_service'
import type { GameReplayStep } from '#application/services/game_engine_types'
import {
  resolveGameDisplayName as resolveDefaultGameDisplayName,
  resolveGamePresentation as resolveDefaultGamePresentation,
} from '#infrastructure/game_engine/game_presentation_registry'
import { toSpectatorPlayerView } from '#presenters/game_presenter'
import { isUserInGameSession } from './game_controller_guard.js'

export type RuntimeSessionSource = 'memory' | 'restored'

export interface RuntimeUserContext {
  readonly userUuid: string
  readonly normalizedRole?: string
}

export interface GameRuntimeAccess {
  readonly session: GameSession
  readonly source: RuntimeSessionSource
  readonly isSpectator: boolean
}

export interface GameRuntimeView extends GameRuntimeAccess {
  readonly playerView: unknown
  readonly availableActions: string[]
  readonly replayTimeline: GameReplayStep[]
  readonly gameDisplayName?: string
  readonly gamePresentation?: GamePresentationDefinition
  readonly runtimeStatus: {
    readonly source: RuntimeSessionSource
    readonly persisted: boolean
    readonly inMemory: true
  }
}

export type RuntimeSessionResolver = (
  gameUuid: string
) => Promise<{ session: GameSession; source: RuntimeSessionSource } | null>

export interface GameRuntimeReader {
  getPlayerView(gameUuid: string, userUuid: string): unknown
  getAvailableActions(gameUuid: string, userUuid: string): string[]
  getReplayTimeline(gameUuid: string): GameReplayStep[]
}

export interface GamePresentationResolver {
  resolvePresentation(gameType: string): GamePresentationDefinition | undefined
  resolveDisplayName(gameType: string): string | undefined
}

export async function resolveGameRuntimeAccess(options: {
  readonly gameUuid: string
  readonly userUuid: string
  readonly resolveRuntimeSession: RuntimeSessionResolver
}): Promise<GameRuntimeAccess | null> {
  const resolvedSession = await options.resolveRuntimeSession(options.gameUuid)
  if (!resolvedSession) {
    return null
  }

  const { session, source } = resolvedSession
  return {
    session,
    source,
    isSpectator: !isUserInGameSession(session, options.userUuid),
  }
}

export async function resolveGameRuntimeView(options: {
  readonly gameUuid: string
  readonly user: RuntimeUserContext
  readonly resolveRuntimeSession: RuntimeSessionResolver
  readonly runtimeReader: GameRuntimeReader
  readonly presentationResolver?: GamePresentationResolver
}): Promise<GameRuntimeView | null> {
  const access = await resolveGameRuntimeAccess({
    gameUuid: options.gameUuid,
    userUuid: options.user.userUuid,
    resolveRuntimeSession: options.resolveRuntimeSession,
  })
  if (!access) {
    return null
  }

  const { session, source, isSpectator } = access
  const presentationResolver = options.presentationResolver ?? defaultPresentationResolver
  const gamePresentation = presentationResolver.resolvePresentation(session.gameType)
  const gameDisplayName = presentationResolver.resolveDisplayName(session.gameType)
  const playerView = isSpectator
    ? toSpectatorPlayerView({ session, currentUserUuid: options.user.userUuid })
    : options.runtimeReader.getPlayerView(options.gameUuid, options.user.userUuid)
  const availableActions = isSpectator
    ? []
    : options.runtimeReader.getAvailableActions(options.gameUuid, options.user.userUuid)

  return {
    ...access,
    playerView,
    availableActions,
    replayTimeline: sanitizeReplayTimelineForViewer(
      options.runtimeReader.getReplayTimeline(options.gameUuid),
      canViewDebugPayload(options.user.normalizedRole)
    ),
    gameDisplayName,
    gamePresentation,
    runtimeStatus: {
      source,
      persisted: source === 'restored',
      inMemory: true,
    },
  }
}

export async function resolveGameActionsView(options: {
  readonly gameUuid: string
  readonly userUuid: string
  readonly resolveRuntimeSession: RuntimeSessionResolver
  readonly getAvailableActions: (gameUuid: string, userUuid: string) => string[]
}): Promise<{
  readonly session: GameSession
  readonly isSpectator: boolean
  readonly availableActions: string[]
} | null> {
  const access = await resolveGameRuntimeAccess({
    gameUuid: options.gameUuid,
    userUuid: options.userUuid,
    resolveRuntimeSession: options.resolveRuntimeSession,
  })
  if (!access) {
    return null
  }

  return {
    session: access.session,
    isSpectator: access.isSpectator,
    availableActions: access.isSpectator
      ? []
      : options.getAvailableActions(options.gameUuid, options.userUuid),
  }
}

export function canViewDebugPayload(role?: string): boolean {
  return role === 'ADMIN'
}

export function sanitizeReplayTimelineForViewer(
  timeline: GameReplayStep[],
  canViewDebugPayload: boolean
): GameReplayStep[] {
  if (canViewDebugPayload) {
    return timeline
  }

  return timeline.map((step) => ({
    ...step,
    actionPayload: undefined,
    events: step.events.map((event) => ({
      type: event.type,
      payload: undefined,
    })),
  }))
}

const defaultPresentationResolver: GamePresentationResolver = {
  resolvePresentation: resolveDefaultGamePresentation,
  resolveDisplayName: resolveDefaultGameDisplayName,
}
