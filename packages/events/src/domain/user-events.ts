import { DomainEvent, type EventMetadata } from '../core/event.js'

/**
 * User event payloads
 */
export interface UserRegisteredPayload {
  userId: string
  email: string
  username: string
  registeredAt: Date
}

export interface UserLoggedInPayload {
  userId: string
  loginAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface UserLoggedOutPayload {
  userId: string
  logoutAt: Date
}

export interface UserProfileUpdatedPayload {
  userId: string
  changes: Record<string, { from: unknown; to: unknown }>
}

export interface UserDisconnectedPayload {
  userId: string
  reason: 'timeout' | 'network' | 'manual'
  lastSeenAt: Date
}

export interface UserReconnectedPayload {
  userId: string
  reconnectedAt: Date
  previousDisconnectReason: string
}

/**
 * User event types enum
 */
export const UserEventTypes = {
  REGISTERED: 'user.registered',
  LOGGED_IN: 'user.logged_in',
  LOGGED_OUT: 'user.logged_out',
  PROFILE_UPDATED: 'user.profile_updated',
  DISCONNECTED: 'user.disconnected',
  RECONNECTED: 'user.reconnected',
} as const

export type UserEventType = (typeof UserEventTypes)[keyof typeof UserEventTypes]

/**
 * User Registered Event
 */
export class UserRegisteredEvent extends DomainEvent<UserRegisteredPayload> {
  readonly type = UserEventTypes.REGISTERED
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserRegisteredPayload,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }

  get aggregateVersion(): number {
    return 1
  }
}

/**
 * User Logged In Event
 */
export class UserLoggedInEvent extends DomainEvent<UserLoggedInPayload> {
  readonly type = UserEventTypes.LOGGED_IN
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserLoggedInPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }
}

/**
 * User Logged Out Event
 */
export class UserLoggedOutEvent extends DomainEvent<UserLoggedOutPayload> {
  readonly type = UserEventTypes.LOGGED_OUT
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserLoggedOutPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }
}

/**
 * User Profile Updated Event
 */
export class UserProfileUpdatedEvent extends DomainEvent<UserProfileUpdatedPayload> {
  readonly type = UserEventTypes.PROFILE_UPDATED
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserProfileUpdatedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }
}

/**
 * User Disconnected Event
 */
export class UserDisconnectedEvent extends DomainEvent<UserDisconnectedPayload> {
  readonly type = UserEventTypes.DISCONNECTED
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserDisconnectedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }
}

/**
 * User Reconnected Event
 */
export class UserReconnectedEvent extends DomainEvent<UserReconnectedPayload> {
  readonly type = UserEventTypes.RECONNECTED
  readonly aggregateType = 'User'

  constructor(
    public readonly payload: UserReconnectedPayload,
    public readonly aggregateVersion: number,
    metadata?: EventMetadata
  ) {
    super(undefined, metadata)
  }

  get aggregateId(): string {
    return this.payload.userId
  }
}

/**
 * Union type of all user events
 */
export type UserEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserProfileUpdatedEvent
  | UserDisconnectedEvent
  | UserReconnectedEvent

/**
 * User event map for typed event bus
 */
export interface UserEventMap {
  [UserEventTypes.REGISTERED]: UserRegisteredEvent
  [UserEventTypes.LOGGED_IN]: UserLoggedInEvent
  [UserEventTypes.LOGGED_OUT]: UserLoggedOutEvent
  [UserEventTypes.PROFILE_UPDATED]: UserProfileUpdatedEvent
  [UserEventTypes.DISCONNECTED]: UserDisconnectedEvent
  [UserEventTypes.RECONNECTED]: UserReconnectedEvent
}
