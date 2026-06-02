import { eventBus } from '#infrastructure/events/event_bus'
import { getAppGameLauncher } from '#infrastructure/game_engine/app_game_launcher'
import {
  GameEngineEventPublisher,
  GameEngineService,
  GameSessionStore,
} from '@infinity.dev/game-runtime-session'

export {
  GameEngineService,
  type RestoreGameSessionRequest,
  type GameActionRequest,
  type GameActionResponse,
  type GameSession,
} from '@infinity.dev/game-runtime-session'

const gameEngineEventPublisher = new GameEngineEventPublisher(eventBus.getUnderlyingBus())

export const gameEngineService = new GameEngineService(
  new GameSessionStore(),
  gameEngineEventPublisher,
  getAppGameLauncher()
)
