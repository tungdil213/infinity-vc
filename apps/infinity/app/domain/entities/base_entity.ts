import { DomainEvent } from '../events/lobby_events.js'

export abstract class BaseEntity {
  private _domainEvents: any[] = []

  protected recordEvent(event: any): void {
    this._domainEvents.push(event)
  }

  getUncommittedEvents(): any[] {
    return [...this._domainEvents]
  }

  clearEvents(): void {
    this._domainEvents = []
  }

  markEventsAsCommitted(): void {
    this._domainEvents = []
  }

  protected generateUuid(): string {
    return crypto.randomUUID()
  }
}
