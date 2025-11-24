import { BaseDomainEventRegistry } from '#shared_kernel/infrastructure/events/base_domain_event_registry'
import type { EventRegistration } from '#shared_kernel/infrastructure/events/domain_event_registry.interface'
import { TransmitBridgeService } from '#shared_kernel/infrastructure/transmit/transmit_bridge.service'
import { GameEndedHandler } from '#integration/event_handlers/game_ended_handler'

/**
 * Registry des événements du domaine Game Engine
 *
 * Responsabilité: Déclarer tous les événements game et leurs handlers
 *
 * Pattern: Chaque domaine est autonome et déclare ses propres événements
 */
export class GameEventRegistry extends BaseDomainEventRegistry {
  readonly domainName = 'game'

  /**
   * Enregistre tous les événements du domaine Game
   *
   * Convention de nommage:
   * - 'created' → 'game.created'
   * - 'move.played' → 'game.move.played'
   */
  registerEvents(): EventRegistration[] {
    return [
      // Événement: Partie créée
      this.event('created', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Partie démarrée
      this.event('started', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Coup joué
      this.event('move.played', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Tour changé
      this.event('turn.changed', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Partie terminée
      this.event('ended', [
        TransmitBridgeService, // Diffuse aux clients
        GameEndedHandler, // Cross-domain: Update lobby status
      ]),

      // Événement: Partie complétée
      this.event('completed', [
        TransmitBridgeService, // Diffuse aux clients
        GameEndedHandler, // Cross-domain: Update lobby status
      ]),

      // Événement: Partie en pause
      this.event('paused', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Partie reprise
      this.event('resumed', [
        TransmitBridgeService, // Diffuse aux clients
      ]),
    ]
  }
}
