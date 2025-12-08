// Event types and base classes
export {
  type IEvent,
  type IDomainEvent,
  type IIntegrationEvent,
  type IEventEnvelope,
  type EventMetadata,
  DomainEvent,
  IntegrationEvent,
} from './event.js'

// Result pattern and errors
export {
  type Result,
  Success,
  Failure,
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from './result.js'

// Event handlers
export {
  type IEventHandler,
  type IMultiEventHandler,
  type IEventHandlerRegistry,
  EventHandler,
  EventHandlerDecorator,
  RetryEventHandler,
} from './handler.js'

// Subscriptions
export {
  type ISubscription,
  type ISubscriber,
  type ISubscriptionManager,
  type SubscriptionOptions,
  type SubscriberCallback,
  type SubscriptionStats,
  Subscription,
} from './subscription.js'
