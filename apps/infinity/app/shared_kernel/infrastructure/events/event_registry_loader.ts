import type { ApplicationService } from '@adonisjs/core/types'
import type { EventBus } from '#shared_kernel/application/event_bus.interface'
import type {
  DomainEventRegistryInterface,
  EventHandlerConstructor,
} from './domain_event_registry.interface.js'
import { createContextLogger } from '#infrastructure/logging/logger'

const logger = createContextLogger('EventRegistryLoader')

/**
 * Charge et enregistre automatiquement tous les Domain Event Registries
 *
 * Pattern: Auto-discovery + Registration
 * Chaque domaine déclare ses événements, le loader les enregistre automatiquement
 *
 * Avantages:
 * - Ajout d'un domaine = 0 modification du provider
 * - Chaque domaine responsable de ses événements
 * - Testable unitairement par domaine
 * - Scalable (100+ domaines)
 */
export class EventRegistryLoader {
  private registeredDomains: Set<string> = new Set()

  constructor(
    private readonly app: ApplicationService,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Charge et enregistre tous les registries de domaines
   * @param registries - Liste des registries à charger
   */
  async loadRegistries(registries: (new () => DomainEventRegistryInterface)[]): Promise<void> {
    logger.info({ count: registries.length }, 'Loading domain event registries')

    for (const RegistryClass of registries) {
      await this.loadRegistry(RegistryClass)
    }

    logger.info(
      {
        domainsCount: this.registeredDomains.size,
        domains: Array.from(this.registeredDomains),
      },
      'All domain event registries loaded successfully'
    )
  }

  /**
   * Charge un registry spécifique
   */
  private async loadRegistry(RegistryClass: new () => DomainEventRegistryInterface): Promise<void> {
    const registry = new RegistryClass()
    const domainName = registry.domainName

    logger.debug({ domainName }, 'Loading domain event registry')

    // Enregistrer le domaine
    this.registeredDomains.add(domainName)

    // Récupérer toutes les registrations d'événements
    const eventRegistrations = registry.registerEvents()

    // Enregistrer chaque événement avec ses handlers
    for (const registration of eventRegistrations) {
      await this.registerEvent(registration.eventName, registration.handlers)
    }

    logger.info(
      { domainName, eventsCount: eventRegistrations.length },
      'Domain event registry loaded'
    )
  }

  /**
   * Enregistre un événement avec ses handlers
   */
  private async registerEvent(
    eventName: string,
    handlerClasses: EventHandlerConstructor[]
  ): Promise<void> {
    logger.debug({ eventName, handlersCount: handlerClasses.length }, 'Registering event')

    for (const HandlerClass of handlerClasses) {
      try {
        // Instancier le handler via le container IoC si possible
        const handler = await this.resolveHandler(HandlerClass)

        // Enregistrer le handler sur l'EventBus
        this.eventBus.subscribe(eventName, handler.handle.bind(handler))

        logger.debug({ eventName, handlerName: HandlerClass.name }, 'Event handler registered')
      } catch (error) {
        logger.error(
          { error, eventName, handlerName: HandlerClass.name },
          'Failed to register event handler'
        )
        throw error
      }
    }
  }

  /**
   * Résout un handler via le container IoC ou l'instancie directement
   */
  private async resolveHandler(HandlerClass: EventHandlerConstructor): Promise<any> {
    try {
      // Essayer de résoudre via le container IoC (pour injection de dépendances)
      return await this.app.container.make(HandlerClass)
    } catch {
      // Sinon, instancier directement
      return new HandlerClass()
    }
  }

  /**
   * Retourne la liste des domaines enregistrés
   */
  getRegisteredDomains(): string[] {
    return Array.from(this.registeredDomains)
  }
}
