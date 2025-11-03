import { inject } from '@adonisjs/core'
import { EventBus } from '#events/event_bus'
import { InMemoryEventBus } from '#events/in_memory_event_bus'
import {
  LobbyPersistenceHandler,
  LobbyBusinessRulesHandler,
  LobbyAnalyticsHandler,
} from './lobby_event_handlers.js'
import { TransmitEventBridge } from './transmit_event_bridge.js'

/**
 * Factory pour créer et configurer le système d'événements complet
 * Centralise l'initialisation de tous les handlers par domaine
 */
@inject()
export class EventSystemFactory {
  private eventBus: EventBus
  private isInitialized = false

  constructor() {
    // Créer l'Event Bus avec configuration par défaut
    this.eventBus = new InMemoryEventBus({
      parallelProcessing: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      handlerTimeoutMs: 10000, // Respect des règles Infinity (10s max)
      enableDetailedLogging: true,
      enableEventStore: true,
    })
  }

  /**
   * Initialise le système d'événements avec tous les handlers
   */
  async initialize(): Promise<EventBus> {
    if (this.isInitialized) {
      console.log('🎯 EventSystemFactory: System already initialized, returning existing bus')
      return this.eventBus
    }

    console.log('🚀 EventSystemFactory: Initializing Event-Driven system...')

    try {
      // Enregistrer les handlers du domaine Lobby
      await this.registerLobbyHandlers()

      // Enregistrer le bridge Transmit
      await this.registerTransmitBridge()

      // Futurs domaines à ajouter ici
      // await this.registerGameHandlers()
      // await this.registerPlayerHandlers()
      // await this.registerNotificationHandlers()

      this.isInitialized = true

      console.log('✅ EventSystemFactory: Event-Driven system initialized successfully')
      console.log('📊 EventSystemFactory: Event Bus stats:', this.eventBus.getStats())

      return this.eventBus
    } catch (error) {
      console.error('❌ EventSystemFactory: Failed to initialize event system:', error)
      throw error
    }
  }

  /**
   * Obtient l'Event Bus (l'initialise si nécessaire)
   */
  async getEventBus(): Promise<EventBus> {
    if (!this.isInitialized) {
      return this.initialize()
    }
    return this.eventBus
  }

  /**
   * Réinitialise complètement le système
   */
  async reset(): Promise<void> {
    console.log('🔄 EventSystemFactory: Resetting event system...')
    this.eventBus.clear()
    this.isInitialized = false
    await this.initialize()
  }

  /**
   * Enregistre tous les handlers du domaine Lobby
   */
  private async registerLobbyHandlers(): Promise<void> {
    console.log('🏠 EventSystemFactory: Registering Lobby domain handlers...')

    // Handler de persistance (priorité 0 - la plus haute)
    const persistenceHandler = new LobbyPersistenceHandler(
      // Injection du repository sera gérée par AdonisJS IoC
      {} as any // Temporaire pour la démo
    )

    // Handler de validation métier (priorité 1)
    const businessRulesHandler = new LobbyBusinessRulesHandler()

    // Handler d'analytics (priorité 10 - basse)
    const analyticsHandler = new LobbyAnalyticsHandler()

    // S'abonner aux événements lobby
    const lobbyEvents = [
      'lobby.created',
      'lobby.player.joined',
      'lobby.player.left',
      'lobby.status.changed',
      'lobby.deleted',
      'lobby.game.started',
    ]

    // Enregistrer chaque handler pour tous les événements lobby
    lobbyEvents.forEach((eventType) => {
      this.eventBus.subscribe(eventType, persistenceHandler)
      this.eventBus.subscribe(eventType, businessRulesHandler)
      this.eventBus.subscribe(eventType, analyticsHandler)
    })

    console.log('✅ EventSystemFactory: Lobby handlers registered successfully')
  }

  /**
   * Enregistre le bridge Transmit pour les communications temps réel
   */
  private async registerTransmitBridge(): Promise<void> {
    console.log('📡 EventSystemFactory: Registering Transmit bridge...')

    const transmitBridge = new TransmitEventBridge()

    // Événements à diffuser via Transmit
    const broadcastEvents = [
      'lobby.created',
      'lobby.player.joined',
      'lobby.player.left',
      'lobby.status.changed',
      'lobby.deleted',
      'lobby.game.started',
      // Futurs événements
      'game.state.changed',
      'notification.sent',
    ]

    broadcastEvents.forEach((eventType) => {
      this.eventBus.subscribe(eventType, transmitBridge)
    })

    console.log('✅ EventSystemFactory: Transmit bridge registered successfully')
  }

  /**
   * Configuration pour environnement de développement
   */
  static createForDevelopment(): EventSystemFactory {
    const factory = new EventSystemFactory()
    // Configuration spécifique dev (plus de logs, timeouts plus longs, etc.)
    return factory
  }

  /**
   * Configuration pour environnement de production
   */
  static createForProduction(): EventSystemFactory {
    const factory = new EventSystemFactory()
    // Configuration spécifique prod (logs réduits, performance optimisée)
    return factory
  }

  /**
   * Configuration pour les tests
   */
  static createForTesting(): EventSystemFactory {
    const factory = new EventSystemFactory()
    // Configuration spécifique tests (pas de Transmit, handlers mock, etc.)
    return factory
  }
}

/**
 * Provider global pour l'Event Bus
 * À utiliser dans les providers AdonisJS pour l'injection de dépendance
 */
export class EventBusProvider {
  private static instance: EventBus | null = null

  static async getInstance(): Promise<EventBus> {
    if (!this.instance) {
      const factory = new EventSystemFactory()
      this.instance = await factory.initialize()
    }
    return this.instance
  }

  static async reset(): Promise<void> {
    this.instance = null
  }
}

/**
 * Types utilitaires pour l'injection de dépendance
 */
export type EventSystemConfig = {
  enableTransmit: boolean
  enableAnalytics: boolean
  enableBusinessRules: boolean
  parallelProcessing: boolean
  handlerTimeoutMs: number
}

export const DEFAULT_EVENT_SYSTEM_CONFIG: EventSystemConfig = {
  enableTransmit: true,
  enableAnalytics: true,
  enableBusinessRules: true,
  parallelProcessing: true,
  handlerTimeoutMs: 10000,
}
