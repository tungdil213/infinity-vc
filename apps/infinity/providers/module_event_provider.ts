import type { ApplicationService } from '@adonisjs/core/types'
import { EventBusService } from '#shared_kernel/infrastructure/event_bus.service'
import { EventRegistryLoader } from '#shared_kernel/infrastructure/events/event_registry_loader'

// Import des Domain Event Registries
import { LobbyEventRegistry } from '#domains/lobby/infrastructure/events/lobby.event_registry'
import { GameEventRegistry } from '#domains/game_engine/infrastructure/events/game.event_registry'
import { UserEventRegistry as IAMEventRegistry } from '#domains/iam/infrastructure/events/user.event_registry'

/**
 * Provider pour initialiser automatiquement les event handlers DDD
 *
 * Architecture Enterprise (Auto-Discovery):
 * - Chaque domaine déclare ses événements via un EventRegistry
 * - Le EventRegistryLoader charge automatiquement tous les registries
 * - Ajout d'un domaine = ajout d'1 ligne ici uniquement
 *
 * Avantages:
 * ✅ Scalable (100+ domaines)
 * ✅ Modulaire (chaque domaine autonome)
 * ✅ Testable (registry testable unitairement)
 * ✅ Maintenable (pas de liste hardcodée d'événements)
 * ✅ Pattern Microsoft/Spring/.NET
 */
export default class ModuleEventProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * S'exécute au démarrage de l'application
   * Charge automatiquement tous les Domain Event Registries
   */
  async boot() {
    try {
      // Récupérer EventBus depuis le container IoC
      const eventBus = await this.app.container.make(EventBusService)

      // Créer le loader pour auto-discovery
      const loader = new EventRegistryLoader(this.app, eventBus)

      /**
       * Liste des Domain Event Registries à charger
       * Ajout d'un domaine = ajout d'1 ligne ici
       */
      await loader.loadRegistries([
        LobbyEventRegistry, // Domaine: Lobby (6 événements)
        GameEventRegistry, // Domaine: Game Engine (8 événements)
        IAMEventRegistry, // Domaine: IAM (Identity & Access) (4 événements)
      ])

      // Logs de confirmation
      const domains = loader.getRegisteredDomains()
      console.log('✅ Event handlers registered successfully')
      console.log(`   📦 Domains loaded: ${domains.join(', ')}`)
      console.log('   📡 TransmitBridge: Auto-broadcasting domain events')
      console.log('   🔗 Cross-domain handlers: Active')
    } catch (error) {
      console.error('❌ Failed to register event handlers:', error)
      throw error
    }
  }
}

/**
 * ========================================================================
 * 🎯 Comment ajouter un nouveau domaine ?
 * ========================================================================
 *
 * 1. Créer le registry du domaine:
 *    ```typescript
 *    // app/domains/payment/infrastructure/events/payment.event_registry.ts
 *    export class PaymentEventRegistry extends BaseDomainEventRegistry {
 *      readonly domainName = 'payment'
 *
 *      registerEvents() {
 *        return [
 *          this.event('created', [TransmitBridge]),
 *          this.event('completed', [TransmitBridge, EmailNotificationHandler]),
 *        ]
 *      }
 *    }
 *    ```
 *
 * 2. Ajouter 1 ligne ici:
 *    ```typescript
 *    import { PaymentEventRegistry } from '#domains/payment/...'
 *
 *    await loader.loadRegistries([
 *      LobbyEventRegistry,
 *      GameEventRegistry,
 *      UserEventRegistry,
 *      PaymentEventRegistry,  ← Ajout ici
 *    ])
 *    ```
 *
 * 3. C'est tout ! ✅
 *    - EventBusService enregistre automatiquement les événements
 *    - TransmitBridge diffuse automatiquement vers les clients
 *    - Logs montrent le nouveau domaine
 *
 * ========================================================================
 */
