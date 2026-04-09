import { runEffectAsResult } from '#domain/shared/effect_result'
import { eventBus } from '#infrastructure/events/event_bus'
import { getAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import {
  GameEngineEventPublisher,
  GameEngineService,
  GameSessionStore,
} from '@infinity.dev/game-runtime-session'

export {
  GameEngineService,
  type EffectResultRunner,
  type RestoreGameSessionRequest,
  type ResultLike,
  type GameActionRequest,
  type GameActionResponse,
  type GameSession,
} from '@infinity.dev/game-runtime-session'

const gameEngineEventPublisher = new GameEngineEventPublisher(eventBus.getUnderlyingBus())

export const gameEngineService = new GameEngineService(
  new GameSessionStore(),
  gameEngineEventPublisher,
  getAppGameLauncher(),
  runEffectAsResult
)
