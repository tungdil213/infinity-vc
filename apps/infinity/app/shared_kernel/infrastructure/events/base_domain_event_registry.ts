import type {
  DomainEventRegistryInterface,
  EventRegistration,
  EventHandlerConstructor,
} from './domain_event_registry.interface.js'

/**
 * Classe de base pour les registres d'événements de domaine
 * Simplifie la déclaration des événements par domaine
 *
 * Usage:
 * ```typescript
 * export class LobbyEventRegistry extends BaseDomainEventRegistry {
 *   protected domainName = 'lobby'
 *
 *   registerEvents() {
 *     return [
 *       this.event('created', [TransmitBridge, AuditHandler]),
 *       this.event('player.joined', [TransmitBridge]),
 *     ]
 *   }
 * }
 * ```
 */
export abstract class BaseDomainEventRegistry implements DomainEventRegistryInterface {
  abstract readonly domainName: string

  /**
   * Enregistre tous les événements du domaine
   * À implémenter dans chaque domaine
   */
  abstract registerEvents(): EventRegistration[]

  /**
   * Helper pour créer une registration d'événement
   * Simplifie la syntaxe dans les domaines
   */
  protected event(
    eventName: string,
    handlers: EventHandlerConstructor[],
    options?: { priority?: number; async?: boolean }
  ): EventRegistration {
    return {
      eventName: `${this.domainName}.${eventName}`,
      handlers,
      options,
    }
  }

  /**
   * Retourne le nom complet d'un événement (domain.event)
   */
  getFullEventName(eventName: string): string {
    return `${this.domainName}.${eventName}`
  }
}
