import { BaseDomainEventRegistry } from '#shared_kernel/infrastructure/events/base_domain_event_registry'
import type { EventRegistration } from '#shared_kernel/infrastructure/events/domain_event_registry.interface'
import { TransmitBridgeService } from '#shared_kernel/infrastructure/transmit/transmit_bridge.service'

/**
 * Registry des événements du domaine Lobby
 *
 * Responsabilité: Déclarer tous les événements lobby et leurs handlers
 *
 * Pattern: Chaque domaine est autonome et déclare ses propres événements
 * Avantage: Ajout d'un événement = modification dans CE fichier uniquement
 */
export class LobbyEventRegistry extends BaseDomainEventRegistry {
  readonly domainName = 'lobby'

  /**
   * Enregistre tous les événements du domaine Lobby
   *
   * Convention de nommage:
   * - 'created' → 'lobby.created'
   * - 'player.joined' → 'lobby.player.joined'
   */
  registerEvents(): EventRegistration[] {
    return [
      // Événement: Lobby créé
      this.event('created', [
        TransmitBridgeService, // Diffuse aux clients
        // Futurs handlers: AuditHandler, AnalyticsHandler, etc.
      ]),

      // Événement: Joueur rejoint le lobby
      this.event('player.joined', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Joueur quitte le lobby
      this.event('player.left', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Statut du lobby change
      this.event('status.changed', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Partie démarre
      this.event('game.started', [
        TransmitBridgeService, // Diffuse aux clients
      ]),

      // Événement: Lobby supprimé
      this.event('deleted', [
        TransmitBridgeService, // Diffuse aux clients
      ]),
    ]
  }

  /**
   * TODO: Méthodes utilitaires du domaine Lobby
   *
   * Exemples:
   * - canPlayerJoin(lobbyId, userId): boolean
   * - getLobbyChannels(lobbyId): string[]
   * - etc.
   */
}
