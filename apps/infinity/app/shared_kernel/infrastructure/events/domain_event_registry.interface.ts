import type { DomainEvent } from '#shared_kernel/domain/events/domain_event'
import type { EventHandler } from '#shared_kernel/application/event_bus.interface'

/**
 * Configuration d'un événement du domaine
 */
export interface EventRegistration {
  eventName: string
  handlers: EventHandlerConstructor[]
  options?: {
    priority?: number
    async?: boolean
  }
}

/**
 * Type pour les constructeurs de handlers
 */
export type EventHandlerConstructor = new (...args: any[]) => {
  handle: (event: DomainEvent) => Promise<void> | void
}

/**
 * Interface pour les registres d'événements par domaine
 * Chaque domaine implémente cette interface pour déclarer ses événements
 *
 * Pattern: Chaque bounded context enregistre ses propres événements
 */
export interface DomainEventRegistryInterface {
  /**
   * Nom du domaine (ex: 'lobby', 'game', 'iam')
   */
  readonly domainName: string

  /**
   * Enregistre tous les événements du domaine
   * Cette méthode est appelée automatiquement au boot
   */
  registerEvents(): EventRegistration[]
}
