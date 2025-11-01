import { EventBus } from '../../application/events/event_bus.js'
import { EventSystemFactory } from './event_system_factory.js'

/**
 * Instance singleton de l'EventBus pour utilisation dans toute l'application
 * Cette approche évite les problèmes d'injection de dépendances avec AdonisJS
 */
class EventBusSingleton {
  private static instance: EventBus | null = null
  private static initializing: Promise<EventBus> | null = null

  /**
   * Obtenir l'instance unique de l'EventBus
   */
  static async getInstance(): Promise<EventBus> {
    // Si déjà initialisé, retourner l'instance
    if (this.instance) {
      return this.instance
    }

    // Si en cours d'initialisation, attendre
    if (this.initializing) {
      return this.initializing
    }

    // Initialiser
    this.initializing = this.initialize()
    this.instance = await this.initializing
    this.initializing = null

    return this.instance
  }

  /**
   * Initialiser le système d'événements
   */
  private static async initialize(): Promise<EventBus> {
    console.log('🚀 EventBusSingleton: Initializing Event-Driven system...')

    const factory = new EventSystemFactory()
    const eventBus = await factory.initialize()

    console.log('✅ EventBusSingleton: Event-Driven system ready')

    return eventBus
  }

  /**
   * Réinitialiser le singleton (utile pour les tests)
   */
  static async reset(): Promise<void> {
    console.log('🔄 EventBusSingleton: Resetting...')
    this.instance = null
    this.initializing = null
  }
}

// Exporter une fonction helper pour obtenir l'EventBus
export async function getEventBus(): Promise<EventBus> {
  return EventBusSingleton.getInstance()
}

// Exporter pour les tests
export { EventBusSingleton }
