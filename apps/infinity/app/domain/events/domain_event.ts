export interface DomainEvent<T = any> {
  readonly eventType: string
  readonly timestamp: Date
  readonly data?: T
}

export abstract class BaseDomainEvent<T = any> implements DomainEvent<T> {
  readonly timestamp: Date = new Date()
  
  constructor(
    public readonly eventType: string,
    public readonly data?: T
  ) {}
}
