import { createDefaultLauncher, type GameLauncher, RpsActionTypes } from '@infinity.dev/game-engine'
import type { IAction, IGameState, IPlayer, IPlayerView } from '@infinity.dev/game-engine/core'
import type { GameRuntimePort } from '@infinity.dev/lobby-application/services'
import { safeSystemError } from '@infinity.dev/lobby-application/shared'
import type { PlayerInterface } from '@infinity.dev/lobby-domain/interfaces'
import { Result } from '@infinity.dev/lobby-domain/shared'
import {
  type GameReplaySnapshot,
  type GameReplayStep,
  type GenericAction,
  type GameActionRequest,
  type GameActionResponse,
  type GameSession,
} from './game_engine_types.js'
import { GameEngineEventPublisher } from './game_engine_event_publisher.js'
import { GameSessionStore } from './game_session_store.js'
import { decodeReplayTimeline } from './replay_payload_decoder.js'

export type { GameActionRequest, GameActionResponse, GameSession } from './game_engine_types.js'

export interface RestoreGameSessionRequest {
  gameId: string
  lobbyId: string
  gameType: string
  players: PlayerInterface[]
  engineState: Record<string, unknown>
  gameSettings?: Record<string, unknown>
  startedAt?: Date
  replayTimeline?: GameReplayStep[]
}

export class GameEngineService implements GameRuntimePort {
  private static readonly GAME_TYPE_ALIASES: Record<string, string> = {
    'love-letter': 'love-letter-infinity-gauntlet',
  }

  constructor(
    private readonly sessionStore: GameSessionStore = new GameSessionStore(),
    private readonly eventPublisher: GameEngineEventPublisher = new GameEngineEventPublisher(),
    private readonly launcher: GameLauncher = createDefaultLauncher()
  ) {}

  async createGame(
    lobbyId: string,
    players: PlayerInterface[],
    gameType: string,
    gameSettings: Record<string, unknown> = {}
  ): Promise<Result<GameSession>> {
    const resolvedGameType = this.resolveGameType(gameType)
    const gamePlayers: IPlayer[] = players.map((player) => ({
      id: player.uuid,
      name: player.nickName,
      isActive: true,
    }))

    const launchResult = this.launcher.launch({
      gameId: resolvedGameType,
      players: gamePlayers,
      settings: gameSettings,
    })
    if (launchResult.isFailure) {
      return Result.fail(safeSystemError(launchResult.error?.message || 'Failed to launch game'))
    }

    let startedResult: Awaited<ReturnType<GameLauncher['startSession']>>
    try {
      startedResult = await this.launcher.startSession(launchResult.value)
    } catch (error) {
      return Result.fail(safeSystemError(error))
    }

    if (startedResult.isFailure) {
      return Result.fail(
        safeSystemError(startedResult.error?.message || 'Failed to initialize game')
      )
    }

    if (!startedResult.value.state) {
      return Result.fail(safeSystemError('Game state is unavailable after session start'))
    }

    const createdSession: GameSession = {
      gameId: startedResult.value.state.gameId,
      lobbyId,
      gameType: resolvedGameType,
      engine: startedResult.value.engine,
      state: startedResult.value.state,
      players: gamePlayers,
      createdAt: new Date(),
    }

    const sessionWithTimeline: GameSession = {
      ...createdSession,
      timeline: [
        this.buildReplayStep({
          step: 0,
          kind: 'initial',
          state: createdSession.state,
        }),
      ],
    }

    this.sessionStore.save(sessionWithTimeline)
    this.eventPublisher.publishGameStarted(
      sessionWithTimeline,
      players.map((player) => ({ uuid: player.uuid, nickName: player.nickName }))
    )

    return Result.ok(sessionWithTimeline)
  }

  getSession(gameId: string): GameSession | undefined {
    return this.sessionStore.get(gameId)
  }

  getReplayTimeline(gameId: string): GameReplayStep[] {
    return [...(this.sessionStore.get(gameId)?.timeline ?? [])]
  }

  getPlayerView(gameId: string, playerId: string): IPlayerView<IGameState> | null {
    const session = this.sessionStore.get(gameId)
    if (!session) return null

    return session.engine.getPlayerView(session.state, playerId)
  }

  getAvailableActions(gameId: string, playerId: string): string[] {
    const session = this.sessionStore.get(gameId)
    if (!session) return []

    return session.engine.getAvailableActions(session.state, playerId)
  }

  executeAction(request: GameActionRequest): GameActionResponse {
    const session = this.sessionStore.get(request.gameId)
    if (!session) {
      return { success: false, error: 'Game not found' }
    }

    const action = this.buildAction(request)

    const validationResult = session.engine.validateAction(session.state, action)
    if (validationResult.isFailure) {
      return { success: false, error: validationResult.error?.message }
    }

    const executeResult = session.engine.executeAction(session.state, action)
    if (executeResult.isFailure) {
      return { success: false, error: executeResult.error?.message }
    }

    const nextState = executeResult.value.newState
    const actionEvents = executeResult.value.events.map((event) => ({
      type: event.type,
      payload: this.toSerializablePayload(event.payload),
    }))

    this.sessionStore.updateState(session.gameId, nextState)
    this.sessionStore.appendReplayStep(
      session.gameId,
      this.buildReplayStep({
        step: session.timeline?.length ?? 0,
        kind: 'action',
        state: nextState,
        actorId: request.playerId,
        actionType: request.actionType,
        actionPayload: request.payload,
        events: actionEvents,
      })
    )
    this.eventPublisher.publishActionEvents(session.gameId, executeResult.value.events)

    if (nextState.isFinished) {
      this.eventPublisher.publishGameFinished(session.gameId, nextState.winnerId)
    }

    return {
      success: true,
      newState: nextState,
      events: actionEvents,
    }
  }

  drawCard(gameId: string, playerId: string): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: 'draw_card',
    })
  }

  playCard(
    gameId: string,
    playerId: string,
    cardType: string,
    targetPlayerId?: string,
    guessedCard?: string
  ): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: 'play_card',
      payload: { cardType, targetPlayerId, guessedCard },
    })
  }

  submitMove(gameId: string, playerId: string, move: string): GameActionResponse {
    return this.executeAction({
      gameId,
      playerId,
      actionType: RpsActionTypes.SUBMIT_MOVE,
      payload: { move },
    })
  }

  endGame(gameId: string): void {
    const session = this.sessionStore.delete(gameId)
    if (session) {
      this.eventPublisher.publishSessionEnded(gameId)
    }
  }

  getActiveSessions(): GameSession[] {
    return this.sessionStore.list()
  }

  getSessionByLobby(lobbyId: string): GameSession | undefined {
    return this.sessionStore.getByLobbyId(lobbyId)
  }

  async restoreGameSession(request: RestoreGameSessionRequest): Promise<Result<GameSession>> {
    const existingSession = this.sessionStore.get(request.gameId)
    if (existingSession) {
      return Result.ok(existingSession)
    }

    const resolvedGameType = this.resolveGameType(request.gameType)
    const gamePlayers: IPlayer[] = request.players.map((player) => ({
      id: player.uuid,
      name: player.nickName,
      isActive: true,
    }))

    const launchResult = this.launcher.launch({
      gameId: resolvedGameType,
      players: gamePlayers,
      settings: request.gameSettings ?? {},
    })

    if (launchResult.isFailure) {
      return Result.fail(launchResult.error?.message || 'Failed to restore game session')
    }

    const deserializedState = launchResult.value.engine.deserializeState(
      JSON.stringify(request.engineState)
    )
    if (deserializedState.isFailure) {
      return Result.fail(
        deserializedState.error?.message || 'Failed to deserialize persisted game state'
      )
    }

    const restoredSession: GameSession = {
      gameId: request.gameId,
      lobbyId: request.lobbyId,
      gameType: resolvedGameType,
      engine: launchResult.value.engine,
      state: deserializedState.value,
      players: gamePlayers,
      createdAt: request.startedAt || new Date(),
      timeline: this.normalizeReplayTimeline(request.replayTimeline, deserializedState.value),
    }

    this.sessionStore.save(restoredSession)
    return Result.ok(restoredSession)
  }

  private normalizeReplayTimeline(
    replayTimeline: GameReplayStep[] | undefined,
    fallbackState: IGameState
  ): GameReplayStep[] {
    if (!Array.isArray(replayTimeline) || replayTimeline.length === 0) {
      return [
        this.buildReplayStep({
          step: 0,
          kind: 'initial',
          state: fallbackState,
        }),
      ]
    }

    const decodedTimeline = decodeReplayTimeline(replayTimeline, { allowEmpty: false })
    if (!decodedTimeline.success) {
      return [
        this.buildReplayStep({
          step: 0,
          kind: 'initial',
          state: fallbackState,
        }),
      ]
    }

    return decodedTimeline.value
  }

  private buildReplayStep(args: {
    step: number
    kind: 'initial' | 'action'
    state: IGameState
    actorId?: string
    actionType?: string
    actionPayload?: Record<string, unknown>
    events?: Array<{ type: string; payload: unknown }>
  }): GameReplayStep {
    return {
      step: Math.max(0, args.step),
      kind: args.kind,
      recordedAt: new Date().toISOString(),
      ...(typeof args.actorId === 'string' ? { actorId: args.actorId } : {}),
      ...(typeof args.actionType === 'string' ? { actionType: args.actionType } : {}),
      ...(args.actionPayload
        ? { actionPayload: this.toSerializablePayload(args.actionPayload) }
        : {}),
      events: (args.events ?? []).map((event) => ({
        type: event.type,
        payload: this.toSerializablePayload(event.payload),
      })),
      snapshot: this.buildReplaySnapshot(args.state),
    }
  }

  private buildReplaySnapshot(state: IGameState): GameReplaySnapshot {
    return this.normalizeReplaySnapshot(state as unknown)
  }

  private normalizeReplaySnapshot(snapshot: unknown): GameReplaySnapshot {
    const source = this.asRecord(snapshot) ?? {}
    const sourcePlayers = Array.isArray(source.players) ? source.players : []

    const players = sourcePlayers.map((rawPlayer) => {
      const player = this.asRecord(rawPlayer) ?? {}

      return {
        id: String(player.id ?? ''),
        name: String(player.name ?? 'Unknown'),
        isActive: Boolean(player.isActive),
        isEliminated: Boolean(player.isEliminated),
        isProtected: Boolean(player.isProtected),
        handCount: Array.isArray(player.hand)
          ? player.hand.length
          : Number(player.handCount ?? 0) || 0,
        tokensOfAffection: Number(player.tokensOfAffection ?? 0) || 0,
      }
    })

    const rounds = Array.isArray(source.rounds)
      ? source.rounds.map((rawRound, index) => {
          const round = this.asRecord(rawRound) ?? {}
          return {
            round: Number(round.round ?? index + 1) || index + 1,
            winnerId: typeof round.winnerId === 'string' ? round.winnerId : null,
            choices: this.asStringRecord(round.choices) ?? {},
          }
        })
      : undefined

    return {
      phase: typeof source.phase === 'string' ? source.phase : 'unknown',
      round: Number(source.round ?? 1) || 1,
      turn: Number(source.turn ?? 0) || 0,
      isFinished: Boolean(source.isFinished),
      winnerId: typeof source.winnerId === 'string' ? source.winnerId : null,
      currentPlayerId: typeof source.currentPlayerId === 'string' ? source.currentPlayerId : null,
      players,
      ...(this.asNumberRecord(source.scores) ? { scores: this.asNumberRecord(source.scores) } : {}),
      ...(this.asStringRecord(source.roundChoices)
        ? { roundChoices: this.asStringRecord(source.roundChoices) }
        : {}),
      ...(rounds ? { rounds } : {}),
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    return null
  }

  private asStringRecord(value: unknown): Record<string, string> | undefined {
    const source = this.asRecord(value)
    if (!source) {
      return undefined
    }

    const mapped = Object.entries(source).reduce<Record<string, string>>((acc, [key, entry]) => {
      if (typeof entry === 'string') {
        acc[key] = entry
      }
      return acc
    }, {})

    return Object.keys(mapped).length > 0 ? mapped : undefined
  }

  private asNumberRecord(value: unknown): Record<string, number> | undefined {
    const source = this.asRecord(value)
    if (!source) {
      return undefined
    }

    const mapped = Object.entries(source).reduce<Record<string, number>>((acc, [key, entry]) => {
      const numericValue = Number(entry)
      if (Number.isFinite(numericValue)) {
        acc[key] = numericValue
      }
      return acc
    }, {})

    return Object.keys(mapped).length > 0 ? mapped : undefined
  }

  private toSerializablePayload<T = unknown>(payload: T): T {
    if (payload === null || payload === undefined) {
      return payload
    }

    try {
      return JSON.parse(JSON.stringify(payload)) as T
    } catch {
      return payload
    }
  }

  private buildAction(request: GameActionRequest): GenericAction {
    return {
      type: request.actionType,
      playerId: request.playerId,
      timestamp: new Date(),
      payload: (request.payload ?? {}) as IAction['payload'],
    } as GenericAction
  }

  private resolveGameType(gameType: string): string {
    const normalizedGameType = GameEngineService.GAME_TYPE_ALIASES[gameType]
    return normalizedGameType || gameType
  }
}
