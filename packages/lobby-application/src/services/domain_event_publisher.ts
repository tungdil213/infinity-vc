export interface DomainEvent {
  type: string
  eventType?: string
  payload?: unknown
}

export interface DomainEventPublisher {
  publishEvents(events: DomainEvent[]): Promise<void>
  publishEvent?(event: DomainEvent): Promise<void>
}
