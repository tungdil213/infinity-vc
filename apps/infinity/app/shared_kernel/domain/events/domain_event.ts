import { v4 as uuidv4 } from 'uuid'

/**
 * Domain Event Base Class
 * Tous les événements du domaine étendent cette classe
 */
export abstract class DomainEvent {
  public readonly eventId: string
  public readonly eventName: string
  public readonly occurredOn: Date
  public readonly payload: any

  protected constructor(eventName: string, payload: any) {
    this.eventId = uuidv4()
    this.eventName = eventName
    this.occurredOn = new Date()
    this.payload = payload
    Object.freeze(this)
  }

  public getAggregateId(): string {
    // Override in subclasses if needed
    return this.payload.id || this.payload.aggregateId
  }
}
