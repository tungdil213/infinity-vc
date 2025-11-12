import { BaseDomainEventRegistry } from '#shared_kernel/infrastructure/events/base_domain_event_registry'
import type { EventRegistration } from '#shared_kernel/infrastructure/events/domain_event_registry.interface'
import { TransmitBridgeService } from '#shared_kernel/infrastructure/transmit/transmit_bridge.service'

/**
 * Registry des événements du domaine IAM (Identity & Access Management)
 *
 * Responsabilité: Déclarer tous les événements user/auth et leurs handlers
 *
 * Pattern: Chaque domaine est autonome et déclare ses propres événements
 */
export class UserEventRegistry extends BaseDomainEventRegistry {
  readonly domainName = 'iam'

  /**
   * Enregistre tous les événements du domaine IAM
   *
   * Convention de nommage:
   * - 'user.registered' → 'iam.user.registered'
   * - 'user.logged.in' → 'iam.user.logged.in'
   */
  registerEvents(): EventRegistration[] {
    return [
      // Événement: Utilisateur enregistré
      this.event('user.registered', [
        TransmitBridgeService, // Diffuse aux clients (notifications)
        // Futurs: WelcomeEmailHandler, AnalyticsHandler
      ]),

      // Événement: Utilisateur connecté
      this.event('user.logged.in', [
        TransmitBridgeService, // Diffuse aux clients
        // Futurs: LoginAuditHandler, SecurityMonitoringHandler
      ]),

      // Événement: Utilisateur déconnecté
      this.event('user.logged.out', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Profil utilisateur mis à jour
      this.event('user.profile.updated', [
        TransmitBridgeService, // Diffuse aux clients
      ]),
    ]
  }
}
