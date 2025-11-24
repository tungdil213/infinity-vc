import { BaseEntity } from './base_entity.js'
import type { DomainEvent } from './events/domain_event.js'

/**
 * Base Aggregate Root
 * Point d'entrée pour les modifications dans un bounded context
 * Gère les domain events
 */
export abstract class BaseAggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = []

  public get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent)
  }

  public clearEvents(): void {
    this._domainEvents = []
  }
}
