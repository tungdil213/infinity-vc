// Lobby events
export {
  type LobbyCreatedPayload,
  type PlayerJoinedLobbyPayload,
  type PlayerLeftLobbyPayload,
  type LobbyStatusChangedPayload,
  type LobbySettingsUpdatedPayload,
  type LobbyOwnerChangedPayload,
  type LobbyClosedPayload,
  type LobbyEvent,
  type LobbyEventMap,
  type LobbyEventType,
  LobbyEventTypes,
  LobbyCreatedEvent,
  PlayerJoinedLobbyEvent,
  PlayerLeftLobbyEvent,
  LobbyStatusChangedEvent,
  LobbySettingsUpdatedEvent,
  LobbyOwnerChangedEvent,
  LobbyClosedEvent,
} from './lobby-events.js'

// Game events
export {
  type GameStartedPayload,
  type GameStateChangedPayload,
  type PlayerTurnStartedPayload,
  type PlayerActionPerformedPayload,
  type PlayerEliminatedPayload,
  type RoundEndedPayload,
  type GameEndedPayload,
  type GamePausedPayload,
  type GameResumedPayload,
  type GameEvent,
  type GameEventMap,
  type GameEventType,
  GameEventTypes,
  GameStartedEvent,
  GameStateChangedEvent,
  PlayerTurnStartedEvent,
  PlayerActionPerformedEvent,
  PlayerEliminatedEvent,
  RoundEndedEvent,
  GameEndedEvent,
  GamePausedEvent,
  GameResumedEvent,
} from './game-events.js'

// User events
export {
  type UserRegisteredPayload,
  type UserLoggedInPayload,
  type UserLoggedOutPayload,
  type UserProfileUpdatedPayload,
  type UserDisconnectedPayload,
  type UserReconnectedPayload,
  type UserEvent,
  type UserEventMap,
  type UserEventType,
  UserEventTypes,
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserProfileUpdatedEvent,
  UserDisconnectedEvent,
  UserReconnectedEvent,
} from './user-events.js'

/**
 * All domain events union
 */
import type { LobbyEvent } from './lobby-events.js'
import type { GameEvent } from './game-events.js'
import type { UserEvent } from './user-events.js'

export type AllDomainEvents = LobbyEvent | GameEvent | UserEvent

/**
 * Combined event map for all domains
 */
import type { LobbyEventMap } from './lobby-events.js'
import type { GameEventMap } from './game-events.js'
import type { UserEventMap } from './user-events.js'

export interface AllEventMap extends LobbyEventMap, GameEventMap, UserEventMap {}
