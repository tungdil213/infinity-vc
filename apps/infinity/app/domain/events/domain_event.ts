export interface DomainEvent<T = any> {
  readonly eventType: string
  readonly timestamp: Date
  readonly data?: T
}

export abstract class BaseDomainEvent<T = any> implements DomainEvent<T> {
  abstract readonly eventType: string
  readonly timestamp: Date
  readonly data?: T

  constructor(timestamp?: Date) {
    this.timestamp = timestamp ?? new Date()
  }
}
