import { ApplicationService } from '@adonisjs/core/types'
import { EventSystemFactory } from '../infrastructure/events/event_system_factory.js'
import { EventBus } from '../application/events/event_bus.js'

/**
 * Provider AdonisJS pour l'architecture Event-Driven
 * Intègre le système d'événements dans le container IoC d'AdonisJS
 */
export default class EventDrivenProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Enregistrer les services dans le container
   */
  async register() {
    console.log('🎯 EventDrivenProvider: Registering Event-Driven services...')

    // Enregistrer l'EventBus comme singleton dans le container
    this.app.container.bind('EventBus', async () => {
      const factory = new EventSystemFactory()
      return factory.initialize()
    })

    // Utiliser l'interface EventBus pour l'injection
    this.app.container.bind(EventBus as any, async (resolver) => {
      return resolver.make('EventBus')
    })

    console.log('✅ EventDrivenProvider: Event-Driven services registered')
  }

  /**
   * Démarrer les services
   */
  async boot() {
    console.log('🚀 EventDrivenProvider: Booting Event-Driven system...')

    // Initialiser le système d'événements au démarrage
    const eventBus = await EventBusProvider.getInstance()

    console.log('📊 EventDrivenProvider: Event system statistics:', eventBus.getStats())
    console.log('✅ EventDrivenProvider: Event-Driven system ready!')
  }

  /**
   * Arrêter les services
   */
  async shutdown() {
    console.log('🔄 EventDrivenProvider: Shutting down Event-Driven system...')

    // Nettoyer les ressources si nécessaire
    await EventBusProvider.reset()

    console.log('✅ EventDrivenProvider: Event-Driven system stopped')
  }
}
